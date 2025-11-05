const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Import Models
const DropshipOrder = require('../models/DropshipOrder');
const RtvReturn = require('../models/RtvReturn');
const UploadedFile = require('../models/UploadedFile');
const ShippingPartner = require('../models/ShippingPartner');
const Seller = require('../models/Seller');
const statusMappingService = require('./statusMappingService');

class ReportProcessor {
  constructor() {
    this.supportedFormats = ['.csv', '.xlsx', '.xls'];
    this.delhiveryBaseUrl = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com/api/v1/packages/json/';
    this.delhiveryToken = process.env.DELHIVERY_TOKEN || '';
  }

  normalizeKey(key) {
    if (!key) return '';
    return String(key).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  normalizeRowKeys(row) {
    const normalized = {};
    for (const [k, v] of Object.entries(row || {})) {
      normalized[this.normalizeKey(k)] = v;
    }
    return normalized;
  }

  pick(normalizedRow, variants = []) {
    for (const variant of variants) {
      const key = this.normalizeKey(variant);
      if (Object.prototype.hasOwnProperty.call(normalizedRow, key)) {
        return normalizedRow[key];
      }
    }
    return undefined;
  }

  pickByRegex(normalizedRow, regexes = []) {
    const keys = Object.keys(normalizedRow);
    for (const rx of regexes) {
      const foundKey = keys.find(k => rx.test(k));
      if (foundKey) return normalizedRow[foundKey];
    }
    return undefined;
  }

  async processDropshipOrderReport(filePath, userId, fileRecordId, options = {}) {
    try {
      const fileExt = path.extname(filePath).toLowerCase();
      let data = [];

      if (fileExt === '.csv') {
        data = await this.parseCSV(filePath);
      } else if (['.xlsx', '.xls'].includes(fileExt)) {
        data = await this.parseExcel(filePath);
      } else {
        throw new Error('Unsupported file format');
      }

      console.log(`📊 Processing ${data.length} records from dropship order report`);
      
      let processedCount = 0;
      const batchSize = 100;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchResult = await this.processBatch(batch, userId);
        processedCount += batchResult;
        console.log(`✅ Processed ${processedCount}/${data.length} records`);
      }

      // Update file processing status
      if (fileRecordId) {
        await UploadedFile.findByIdAndUpdate(fileRecordId, {
          processed: true,
          recordsProcessed: processedCount,
          processingStatus: 'completed'
        });
      } else {
        await UploadedFile.findOneAndUpdate(
          { uploadedBy: userId, originalName: { $regex: path.basename(filePath, path.extname(filePath)) } },
          { 
            processed: true, 
            recordsProcessed: processedCount,
            processingStatus: 'completed'
          },
          { sort: { createdAt: -1 } }
        );
      }

      return { success: true, recordsProcessed: processedCount };
    } catch (error) {
      console.error('❌ Error processing dropship order report:', error);
      
      // Update file status to failed
      if (fileRecordId) {
        await UploadedFile.findByIdAndUpdate(fileRecordId, {
          processingStatus: 'failed',
          errorMessage: error.message
        });
      } else {
        await UploadedFile.findOneAndUpdate(
          { uploadedBy: userId, originalName: { $regex: path.basename(filePath, path.extname(filePath)) } },
          { 
            processingStatus: 'failed',
            errorMessage: error.message
          },
          { sort: { createdAt: -1 } }
        );
      }
      
      throw error;
    }
  }

  async processBatch(batch, userId) {
    let processedCount = 0;
    
    for (const row of batch) {
      try {
        const orderData = this.mapDropshipOrderData(row, userId);

        // Attempt to link order to a Seller using POB ID or Seller Name
        try {
          const pob = (orderData.pobId || '').toString().trim();
          const name = (orderData.sellerName || '').toString().trim();
          let sellerDoc = null;
          if (pob) {
            sellerDoc = await Seller.findOne({ pobIds: pob, isActive: true }).lean();
          }
          if (!sellerDoc && name) {
            sellerDoc = await Seller.findOne({ name: new RegExp(`^${name}$`, 'i'), isActive: true }).lean();
          }
          if (sellerDoc) {
            orderData.seller = sellerDoc._id;
            orderData.sellerName = sellerDoc.name;
          }
        } catch (_) {}
        
        // Check if record already exists (handle multiple SKUs with same customer order)
        const existingRecord = await DropshipOrder.findOne({
          custOrderNo: orderData.custOrderNo,
          fwdSellerOrderNo: orderData.fwdSellerOrderNo,
          jioCode: orderData.jioCode
        });

        if (!existingRecord) {
          // Insert new record
          await DropshipOrder.create(orderData);
          processedCount++;
        } else {
          // Update existing record with latest data
          await DropshipOrder.findByIdAndUpdate(existingRecord._id, orderData);
          processedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing row:`, error.message);
        // Continue processing other rows
      }
    }
    
    return processedCount;
  }

  mapDropshipOrderData(row, userId) {
    const r = this.normalizeRowKeys(row);
    // Handle complex business logic for cancellations
    const status = (this.pick(r, ['Status']) || '').toString();
    const hasInvoiceDetails = !!(this.pick(r, ['Seller Invoice No','Seller Invoice No.']) && this.pick(r, ['Cust Invoice No','Cust Invoice No.']));
    const isCancelled = status.toLowerCase() === 'cancelled';
    const isPreInvoiceCancellation = isCancelled && !hasInvoiceDetails;
    const isPostInvoiceCancellation = isCancelled && hasInvoiceDetails;

    return {
      custOrderNo: this.pick(r, [
        'Cust Order No','Customer Order No','Customer Order #','Customer Order Id','CO Number','CO No','CO No.'
      ]) || '',
      custOrderDate: this.parseDate(this.pick(r, [
        'Cust Order Date','Customer Order Date','Order Date','CO Date','Customer Order Dt'
      ])),
      fwdSellerOrderNo: this.pick(r, ['FWD Seller Order NO','FWD Seller Order No']) || '',
      fwdPoNo: this.pick(r, ['FWD PO NO','FWD PO No']) || '',
      fwdPoDate: this.parseDate(this.pick(r, ['FWD PO Date'])),
      sellerInvoiceNo: this.pick(r, ['Seller Invoice No','Seller Invoice No.']) || '',
      sellerInvoiceDate: this.parseDate(this.pick(r, ['Seller Invoice Date'])),
      custInvoiceNo: this.pick(r, ['Cust Invoice No','Cust Invoice No.']) || '',
      custInvoiceDate: this.parseDate(this.pick(r, ['Cust Invoice Date'])),
      status: status,
      jioCode: this.pick(r, ['JioCode','JIO Code','Jio Code']) || '',
      hsn: this.pick(r, ['HSN']) || '',
      sellerStyleCode: this.pick(r, ['Seller Style Code']) || '',
      sellerSku: this.pick(r, ['Seller SKU']) || '',
      ean: this.pick(r, ['EAN']) || '',
      description: this.pick(r, ['Description']) || '',
      orderQty: parseInt((this.pick(r, ['Order Qty']) || '0').toString().replace(/[, ]/g,'')) || 0,
      fwdShipmentId: this.pick(r, ['FWD Shipment ID']) || '',
      fwdShipmentDate: this.parseDate(this.pick(r, ['FWD Shipment Date'])),
      fwdCarrier: this.pick(r, ['FWD Carrier']) || '',
      fwdAwb: this.pick(r, ['FWD AWB']) || '',
      shippedQty: parseInt((this.pick(r, ['Shipped QTY']) || '0').toString().replace(/[, ]/g,'')) || 0,
      estimatedDispatchDate: this.parseDate(this.pick(r, ['Estimated Dispatch Date'])),
      slaStatus: this.pick(r, ['SLA Status']) || '',
      cancelledQty: parseInt((this.pick(r, ['Cancelled Qty']) || '0').toString().replace(/[, ]/g,'')) || 0,
      customerCancelledQty: parseInt((this.pick(r, ['Customer Cancelled QTY']) || '0').toString().replace(/[, ]/g,'')) || 0,
      sellerCancelledQty: parseInt((this.pick(r, ['Seller Cancelled QTY']) || '0').toString().replace(/[, ]/g,'')) || 0,
      listingMrp: parseFloat((this.pick(r, ['Listing MRP']) || '0').toString().replace(/[, ]/g,'')) || 0,
      sellerTd: parseFloat((this.pick(r, ['Seller TD']) || '0').toString().replace(/[, ]/g,'')) || 0,
      sellingPrice: parseFloat((this.pick(r, ['Selling Price']) || '0').toString().replace(/[, ]/g,'')) || 0,
      basePrice: parseFloat((this.pick(r, ['Base Price']) || '0').toString().replace(/[, ]/g,'')) || 0,
      totalPrice: parseFloat((this.pick(r, ['Total Price']) || '0').toString().replace(/[, ]/g,'')) || 0,
      cgstPercentage: parseFloat((this.pick(r, ['CGST_PERCENTAGE']) || '0').toString().replace(/[, ]/g,'')) || 0,
      cgstAmount: parseFloat((this.pick(r, ['CGST_AMOUNT']) || '0').toString().replace(/[, ]/g,'')) || 0,
      sgstPercentage: parseFloat((this.pick(r, ['SGST_PERCENTAGE']) || '0').toString().replace(/[, ]/g,'')) || 0,
      sgstAmount: parseFloat((this.pick(r, ['SGST_AMOUNT']) || '0').toString().replace(/[, ]/g,'')) || 0,
      igstPercentage: parseFloat((this.pick(r, ['IGST_PERCENTAGE']) || '0').toString().replace(/[, ]/g,'')) || 0,
      igstAmount: parseFloat((this.pick(r, ['IGST_AMOUNT']) || '0').toString().replace(/[, ]/g,'')) || 0,
      totalValue: parseFloat((this.pick(r, ['Total Value']) || '0').toString().replace(/[, ]/g,'')) || 0,
      invoiceValue: parseFloat((this.pick(r, [
        'Invoice Value','Invoice Amount','Invoice Total','Total Invoice Value','InvoiceValue'
      ]) || '0').toString().replace(/[, ]/g,'')) || 0,
      brand: this.pick(r, ['Brand']) || '',
      fulfillmentType: this.pick(r, ['Fulfillment Type']) || '',
      pobId: this.pick(r, ['POB ID']) || '',
      sellerName: this.pick(r, ['Seller Name']) || '',
      
      // Complex Business Logic
      isPreInvoiceCancellation,
      isPostInvoiceCancellation,
      hasInvoiceDetails,
      
      // Processing Info
      uploadedBy: userId,
      processedAt: new Date()
    };
  }

  async processRTVReport(filePath, userId, fileRecordId, options = {}) {
    try {
      const fileExt = path.extname(filePath).toLowerCase();
      let data = [];

      if (fileExt === '.csv') {
        data = await this.parseCSV(filePath);
      } else if (['.xlsx', '.xls'].includes(fileExt)) {
        data = await this.parseExcel(filePath);
      }

      // Debug: Log the first row to see what fields are available
      if (data.length > 0) {
        console.log('📋 Available fields in uploaded file:', Object.keys(data[0]));
        console.log('📋 Sample row:', data[0]);
      }

      let processedCount = 0;
      
      const bulkOps = [];
      for (const row of data) {
        try {
          const returnData = this.mapRTVData(row, userId);
          bulkOps.push({
            updateOne: {
              filter: { returnId: returnData.returnId },
              update: { $set: returnData },
              upsert: true
            }
          });
        } catch (error) {
          console.error(`❌ Error preparing return row:`, error.message);
        }
      }
      if (bulkOps.length > 0) {
        const result = await RtvReturn.bulkWrite(bulkOps, { ordered: false });
        processedCount = (result.upsertedCount || 0) + (result.modifiedCount || 0) + (result.matchedCount || 0);
      }

      // Update file processing status
      if (fileRecordId) {
        await UploadedFile.findByIdAndUpdate(fileRecordId, {
          processed: true,
          recordsProcessed: processedCount,
          processingStatus: 'completed'
        });
      } else {
        await UploadedFile.findOneAndUpdate(
          { uploadedBy: userId, originalName: { $regex: path.basename(filePath, path.extname(filePath)) } },
          { 
            processed: true, 
            recordsProcessed: processedCount,
            processingStatus: 'completed'
          },
          { sort: { createdAt: -1 } }
        );
      }

      return { success: true, recordsProcessed: processedCount };
    } catch (error) {
      console.error('❌ Error processing RTV report:', error);
      // Update file status to failed
      if (fileRecordId) {
        await UploadedFile.findByIdAndUpdate(fileRecordId, {
          processingStatus: 'failed',
          errorMessage: error.message
        });
      } else {
        await UploadedFile.findOneAndUpdate(
          { uploadedBy: userId, originalName: { $regex: path.basename(filePath, path.extname(filePath)) } },
          { 
            processingStatus: 'failed',
            errorMessage: error.message
          },
          { sort: { createdAt: -1 } }
        );
      }
      throw error;
    }
  }

  mapRTVData(row, userId) {
    const r = this.normalizeRowKeys(row);
    const valueOr = (val, fallback='') => (val === undefined || val === null ? fallback : val);

    // Helpers to normalize enums and strings
    const cleanMoney = (v) => {
      if (v === undefined || v === null) return 0;
      const s = String(v).replace(/[₹,\s]/g, '').replace(/^[^0-9\-]*/, '');
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    const normalizeStatus = (v) => {
      const s = String(v || '').toLowerCase().trim();
      if (!s) return 'initiated';
      
      // More comprehensive status mapping
      if (/(init|created|new|pending|open)/.test(s)) return 'initiated';
      if (/(pickup|schedule|pick.*up)/.test(s)) return 'pickup_scheduled';
      if (/(transit|intransit|shipped|moving|in.*transit|out.*for.*delivery)/.test(s)) return 'in_transit';
      if (/(warehouse|hub|received|delivered|delivery.*complete|successfully.*delivered)/.test(s)) return 'delivered_to_warehouse';
      if (/(quality|qc|inspection|checking)/.test(s)) return 'quality_check';
      if (/(refund|refunded|completed|closed|settled|processed|finished)/.test(s)) return 'refunded';
      if (/(replace|replacement|exchanged)/.test(s)) return 'replaced';
      if (/(reject|rejected|failed|cancelled|canceled|declined)/.test(s)) return 'rejected';
      
      // If no match found, log it for debugging
      console.log(`⚠️ Unmapped status: "${v}" (normalized: "${s}")`);
      return 'initiated';
    };

    const normalizePartner = (v) => {
      const s = String(v || '').toUpperCase().replace(/[^A-Z]/g, '');
      if (!s) return '';
      if (s.includes('DELHIVERY')) return 'DELHIVERY';
      if (s.includes('SHADOWFAX')) return 'SHADOWFAX';
      if (s.includes('XPRESS') || s.includes('XPRESSBEES')) return 'XPRESSBEES';
      if (s.includes('BLUEDART')) return 'BLUEDART';
      if (s.includes('DTDC')) return 'DTDC';
      if (s.includes('ECOM')) return 'ECOM';
      if (s.includes('FEDEX')) return 'FEDEX';
      return '';
    };

    const normalizePriority = (v) => {
      const s = String(v || '').toLowerCase();
      if (/high|urgent|critical/.test(s)) return 'high';
      if (/low|minor/.test(s)) return 'low';
      return 'medium';
    };

    // Identify IDs and core fields (supporting many header variants)
    const returnId = valueOr(
      this.pick(r, [
        'Return ID','ReturnId','RTV ID','RTV No','Return Ref No','Return Reference No',
        'Return Request ID','Reverse Return ID','Reverse Pickup ID',
        'RETURN ORDER NUMBER','Return Order Number'
      ]) ||
      this.pickByRegex(r, [/^return.*(id|no|number)$/, /^rtv.*(id|no|number)$/]),
      `RTV${Date.now()}${Math.random().toString(36).substr(2, 5)}`
    );

    const orderId = valueOr(
      this.pick(r, [
        'Order ID','OrderId','Order Number','Order No','Order#','CO Number','CO No','CO No.',
        'Cust Order No','Customer Order No','Customer Order #','Customer Order Id'
      ]) ||
      this.pickByRegex(r, [/^(customer)?\s*order.*(id|no|number|#)$/]),
      'NA'
    );

    const customerName = valueOr(
      this.pick(r, ['Customer Name','Buyer Name','Recipient Name','Customer Full Name','Buyer']) ||
      this.pickByRegex(r, [/^customer.*name$/, /buyer.*name/, /recipient.*name/]),
      'NA'
    );

    const customerEmail = valueOr(
      this.pick(r, ['Customer Email','Email','Email ID','Customer Email Id']) ||
      this.pickByRegex(r, [/email/]),
      ''
    );

    const productName = valueOr(
      this.pick(r, ['Product Name','Item Name','Description','Product Description','SKU Description']) ||
      this.pickByRegex(r, [/product.*name|item.*name|description/]),
      'NA'
    );

    const returnReason = valueOr(
      this.pick(r, ['Return Reason','Reason for Return','Return Remarks','Remarks','Cancellation Reason','Cancel Reason']) ||
      this.pickByRegex(r, [/reason|remark/]),
      ''
    );
    // Seller fields for returns (if present in source)
    const sellerName = valueOr(
      this.pick(r, ['Seller Name']) || this.pickByRegex(r, [/seller.*name/]),
      ''
    );

    // Note: linking to Seller collection by name/pob may require enrichment; keep seller null here


    const rawStatus = valueOr(
      this.pick(r, [
        'Status','Return Status','Return Sub Status','Sub Status','Reverse Status','3PL Delivery Status',
        'Delivery Status','Current Status','Return Current Status','RTV Status','Return Request Status',
        'Status Description','Return Status Description','Current Return Status'
      ]) ||
      this.pickByRegex(r, [/status/]),
      'initiated'
    );
    const status = normalizeStatus(rawStatus);
    
    // Debug logging for status mapping
    if (rawStatus && rawStatus !== 'initiated') {
      console.log(`🔄 Status mapping: "${rawStatus}" -> "${status}"`);
    }

    const rawPartner = valueOr(
      this.pick(r, ['Shipping Partner','Courier','Carrier','Logistics Partner','Courier Name','Reverse Courier']) ||
      this.pickByRegex(r, [/partner|carrier|courier|logistics/]),
      ''
    );
    const shippingPartner = normalizePartner(rawPartner);

    const trackingNumber = valueOr(
      this.pick(r, [
        'Tracking Number','AWB','AWB No','AWB No.','AWB Number','Waybill','Waybill No','Waybill No.',
        'Reverse AWB','Reverse Pickup AWB','RP AWB','RVP AWB','Consignment No'
      ]) ||
      this.pickByRegex(r, [/tracking|awb|waybill|consignment/]),
      ''
    ).toString().replace(/\s/g, '');

    const initiatedDate = this.parseDate(
      this.pick(r, ['Initiated Date','Created Date','Request Date','Return Initiated Date','Return Created Date','Return Requested Date']) ||
      this.pickByRegex(r, [/initiated|start.*date|created|request.*date/])
    );

    const expectedDelivery = this.parseDate(
      this.pick(r, ['Expected Delivery','ETA','Expected Date','Expected Delivery Date','Reverse Pickup Date','Delivered To WH Date']) ||
      this.pickByRegex(r, [/expected|eta|delivery.*date|pickup.*date|wh\s*date/])
    );

    const refundAmount = cleanMoney(
      this.pick(r, [
        'Refund Amount','Refunded Amount','Amount to Refund','Refund Value','Total Refund','Refund Amt','Amount',
        'Refund Amount (Rs)','Refund Amount (INR)','Refund Amount(Rs)','Refund Amount(INR)'
      ]) ||
      this.pickByRegex(r, [/refund.*amount|amount.*refund|refund.*value|total.*refund|refund.*amt|^amount$/]) || 0
    );

    const priority = normalizePriority(valueOr(this.pick(r, ['Priority','Prio']) || this.pickByRegex(r, [/priority|prio/]), 'medium'));

    return {
      returnId,
      orderId,
      customerName,
      customerEmail,
      productName,
      returnReason,
      status,
      shippingPartner,
      trackingNumber,
      initiatedDate,
      expectedDelivery,
      refundAmount,
      priority,
      rawRow: row,
      normalizedRow: r,
      uploadedBy: userId,
      processedAt: new Date()
    };
  }

  parseDate(dateString) {
    if (!dateString || dateString === 'NA' || dateString === '') return null;
    try {
      if (typeof dateString === 'string') {
        const s = dateString.trim();
        const dmY = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
        const m = s.match(dmY);
        if (m) {
          const d = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10) - 1;
          const y = parseInt(m[3].length === 2 ? ('20' + m[3]) : m[3], 10);
          const dt = new Date(Date.UTC(y, mo, d));
          return isNaN(dt.getTime()) ? null : dt;
        }
      }
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  async parseExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  async getDashboardMetrics() {
    try {
      // Get order metrics with aggregation pipeline (base numbers)
      const orderMetrics = await DropshipOrder.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            preInvoiceCancellations: { $sum: { $cond: [{ $ifNull: ['$isPreInvoiceCancellation', false] }, 1, 0] } },
            postInvoiceCancellations: { $sum: { $cond: [{ $ifNull: ['$isPostInvoiceCancellation', false] }, 1, 0] } },
            totalRevenue: { $sum: { $ifNull: ['$invoiceValue', 0] } },
            avgOrderValue: { $avg: { $ifNull: ['$invoiceValue', 0] } }
          }
        }
      ]);

      // Get return metrics
      const returnMetrics = await RtvReturn.aggregate([
        {
          $group: {
            _id: null,
            totalReturns: { $sum: 1 },
            completedReturns: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
            pendingReturns: { $sum: { $cond: [{ $not: [{ $in: ['$status', ['refunded', 'rejected']] }] }, 1, 0] } },
            totalRefundAmount: { $sum: '$refundAmount' }
          }
        }
      ]);

      // Get shipping partner performance
      const partnerMetrics = await DropshipOrder.aggregate([
        {
          $match: { $and: [ { fwdCarrier: { $ne: null } }, { fwdCarrier: { $ne: '' } } ] }
        },
        {
          $group: {
            _id: '$fwdCarrier',
            totalOrders: { $sum: 1 },
            deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } }  
          }
        },
        {
          $project: {
            partner: '$_id',
            totalOrders: 1,
            deliveredOrders: 1,
            successRate: {
              $multiply: [
                { $divide: ['$deliveredOrders', '$totalOrders'] },
                100
              ]
            }
          }
        }
      ]);

      const orders = orderMetrics[0] || {};
      const returns = returnMetrics[0] || {};

      // Get additional status counts using the mapping service
      const allOrders = await DropshipOrder.find({}).lean();
      const allReturns = await RtvReturn.find({}).lean();
      const statusStats = statusMappingService.getStatusStatistics(allOrders, allReturns);

      return {
        orders: {
          total: orders.totalOrders || 0,
          // Use dynamic mapped counts from deliveryStatus/current tracking data
          delivered: statusStats.orders.delivered || 0,
          cancelled: statusStats.orders.cancelled || 0,
          shipped: (statusStats.orders.in_transit || 0) + (statusStats.orders.out_for_delivery || 0) + (statusStats.orders.dispatched || 0) + (statusStats.orders.picked_up || 0),
          preInvoiceCancellations: orders.preInvoiceCancellations || 0,
          postInvoiceCancellations: orders.postInvoiceCancellations || 0,
          totalRevenue: orders.totalRevenue || 0,
          avgOrderValue: orders.avgOrderValue || 0,
          // Add mapped status counts
          statusCounts: statusStats.orders,
          inTransit: statusStats.orders.in_transit || 0,
          pending: statusStats.orders.pending || 0,
          exception: statusStats.orders.exception || 0
        },
        returns: {
          total: returns.totalReturns || 0,
          completed: returns.completedReturns || 0,
          pending: returns.pendingReturns || 0,
          totalRefundAmount: returns.totalRefundAmount || 0,
          // Add mapped status counts
          statusCounts: statusStats.returns,
          inProgress: statusStats.returns.in_transit || 0,
          initiated: statusStats.returns.initiated || 0,
          rejected: statusStats.returns.rejected || 0
        },
        partners: partnerMetrics.map(p => ({
          name: p.partner,
          totalOrders: p.totalOrders || 0,
          deliveredOrders: p.deliveredOrders || 0,
          successRate: (p.successRate || 0).toFixed(1)
        })),
        // Add tracking information
        tracking: {
          totalAwbs: await this.getTotalAwbsCount(),
          pendingUpdates: await this.getPendingTrackingUpdates(),
          lastSync: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Error getting dashboard metrics:', error);
      throw error;
    }
  }

  // Helper method to get total AWB count
  async getTotalAwbsCount() {
    try {
      const count = await DropshipOrder.countDocuments({ 
        fwdAwb: { $exists: true, $ne: null, $ne: '' } 
      });
      return count;
    } catch (error) {
      console.error('Error getting total AWB count:', error);
      return 0;
    }
  }

  // Helper method to get pending tracking updates
  async getPendingTrackingUpdates() {
    try {
      const count = await DropshipOrder.countDocuments({
        fwdAwb: { $exists: true, $ne: null, $ne: '' },
        $or: [
          { lastTrackingUpdate: { $exists: false } },
          { lastTrackingUpdate: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Older than 24 hours
        ]
      });
      return count;
    } catch (error) {
      console.error('Error getting pending tracking updates:', error);
      return 0;
    }
  }

  async getOrdersWithFilters(filters = {}) {
    try {
      let query = {};
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.partner) {
        query.fwdCarrier = filters.partner;
      }

      // Seller filter: by sellerId (ObjectId) or by sellerName text
      if (filters.sellerId) {
        try {
          const mongoose = require('mongoose');
          if (mongoose.Types.ObjectId.isValid(filters.sellerId)) {
            query.seller = new mongoose.Types.ObjectId(filters.sellerId);
          }
        } catch {}
      } else if (filters.sellerName) {
        query.sellerName = { $regex: filters.sellerName, $options: 'i' };
      }
      
      if (filters.search) {
        query.$or = [
          { custOrderNo: { $regex: filters.search, $options: 'i' } },
          { fwdSellerOrderNo: { $regex: filters.search, $options: 'i' } },
          { fwdAwb: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { sellerName: { $regex: filters.search, $options: 'i' } }
        ];
      }

      // Date range filters
      if (filters.fromDate || filters.toDate) {
        query.custOrderDate = {};
        if (filters.fromDate) query.custOrderDate.$gte = new Date(filters.fromDate);
        if (filters.toDate) query.custOrderDate.$lte = new Date(filters.toDate);
      }

      // Amount range
      if (filters.minInvoice || filters.maxInvoice) {
        query.invoiceValue = {};
        if (filters.minInvoice) query.invoiceValue.$gte = Number(filters.minInvoice);
        if (filters.maxInvoice) query.invoiceValue.$lte = Number(filters.maxInvoice);
      }

      // Flags
      if (filters.hasInvoiceDetails === 'true') query.hasInvoiceDetails = true;
      if (filters.preInvoice === 'true') query.isPreInvoiceCancellation = true;
      if (filters.postInvoice === 'true') query.isPostInvoiceCancellation = true;

      const page = Math.max(1, parseInt(filters.page || 1));
      const pageSize = Math.max(1, Math.min(200, parseInt(filters.pageSize || 25)));
      const skip = (page - 1) * pageSize;

      const [total, items, summaryAgg] = await Promise.all([
        DropshipOrder.countDocuments(query),
        DropshipOrder.find(query)
          .sort({ custOrderDate: -1 })
          .skip(skip)
          .limit(pageSize)
          .lean(),
        DropshipOrder.aggregate([
          { $match: query },
          { $group: {
              _id: null,
              delivered: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } },
              cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
              preInvoice: { $sum: { $cond: [{ $ifNull: ['$isPreInvoiceCancellation', false] }, 1, 0] } },
              postInvoice: { $sum: { $cond: [{ $ifNull: ['$isPostInvoiceCancellation', false] }, 1, 0] } },
              revenue: { $sum: { $ifNull: ['$invoiceValue', 0] } }
            }
          }
        ])
      ]);

      const summaryDoc = summaryAgg[0] || {};
      const summary = {
        total,
        delivered: summaryDoc.delivered || 0,
        cancelled: summaryDoc.cancelled || 0,
        preInvoice: summaryDoc.preInvoice || 0,
        postInvoice: summaryDoc.postInvoice || 0,
        revenue: summaryDoc.revenue || 0
      };

      return { items, total, page, pageSize, summary };
    } catch (error) {
      console.error('❌ Error getting orders:', error);
      throw error;
    }
  }

  async getReturnsWithFilters(filters = {}) {
    try {
      let query = {};
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.search) {
        query.$or = [
          { returnId: { $regex: filters.search, $options: 'i' } },
          { orderId: { $regex: filters.search, $options: 'i' } },
          { customerName: { $regex: filters.search, $options: 'i' } },
          { trackingNumber: { $regex: filters.search, $options: 'i' } }
        ];
      }

      // Partner filter
      if (filters.partner) {
        query.shippingPartner = filters.partner;
      }

      // Seller filter: by sellerId (ObjectId) or sellerName
      if (filters.sellerId) {
        try {
          const mongoose = require('mongoose');
          if (mongoose.Types.ObjectId.isValid(filters.sellerId)) {
            query.seller = new mongoose.Types.ObjectId(filters.sellerId);
          }
        } catch {}
      } else if (filters.sellerName) {
        query.sellerName = { $regex: filters.sellerName, $options: 'i' };
      }

      // Date range
      if (filters.fromDate || filters.toDate) {
        query.initiatedDate = {};
        if (filters.fromDate) query.initiatedDate.$gte = new Date(filters.fromDate);
        if (filters.toDate) query.initiatedDate.$lte = new Date(filters.toDate);
      }

      // Refund amount range
      if (filters.minRefund || filters.maxRefund) {
        query.refundAmount = {};
        if (filters.minRefund) query.refundAmount.$gte = Number(filters.minRefund);
        if (filters.maxRefund) query.refundAmount.$lte = Number(filters.maxRefund);
      }

      // Our status vs Ajio status filter
      if (filters.ourStatus) {
        query.ourStatus = filters.ourStatus;
      }
      if (filters.mismatch === 'true') {
        query.$expr = { $ne: [{ $toLower: '$status' }, { $toLower: '$ourStatus' }] };
      }

      const page = Math.max(1, parseInt(filters.page || 1));
      const pageSizeRaw = filters.pageSize;
      const total = await RtvReturn.countDocuments(query);

      // Support pageSize="all" to return all documents (with a safety cap)
      const SAFETY_MAX = 5000;
      let pageSize;
      let items;
      if (pageSizeRaw === 'all' || pageSizeRaw === -1 || pageSizeRaw === '-1') {
        pageSize = Math.min(total || 0, SAFETY_MAX) || SAFETY_MAX;
        items = await RtvReturn.find(query)
          .sort({ initiatedDate: -1 })
          .limit(pageSize)
          .lean();
        return { items, total, page: 1, pageSize };
      } else {
        pageSize = Math.max(1, Math.min(SAFETY_MAX, parseInt(pageSizeRaw || 25)));
        const skip = (page - 1) * pageSize;
        items = await RtvReturn.find(query)
          .sort({ initiatedDate: -1 })
          .skip(skip)
          .limit(pageSize)
          .lean();
        return { items, total, page, pageSize };
      }
    } catch (error) {
      console.error('❌ Error getting returns:', error);
      throw error;
    }
  }

  // Test function to verify status mapping
  testStatusMapping() {
    const normalizeStatus = (v) => {
      const s = String(v || '').toLowerCase().trim();
      if (!s) return 'initiated';
      
      // More comprehensive status mapping
      if (/(init|created|new|pending|open)/.test(s)) return 'initiated';
      if (/(pickup|schedule|pick.*up)/.test(s)) return 'pickup_scheduled';
      if (/(transit|intransit|shipped|moving|in.*transit|out.*for.*delivery)/.test(s)) return 'in_transit';
      if (/(warehouse|hub|received|delivered|delivery.*complete|successfully.*delivered)/.test(s)) return 'delivered_to_warehouse';
      if (/(quality|qc|inspection|checking)/.test(s)) return 'quality_check';
      if (/(refund|refunded|completed|closed|settled|processed|finished)/.test(s)) return 'refunded';
      if (/(replace|replacement|exchanged)/.test(s)) return 'replaced';
      if (/(reject|rejected|failed|cancelled|canceled|declined)/.test(s)) return 'rejected';
      
      // If no match found, log it for debugging
      console.log(`⚠️ Unmapped status: "${v}" (normalized: "${s}")`);
      return 'initiated';
    };

    const testCases = [
      'delivered',
      'Delivered',
      'DELIVERED',
      'warehouse',
      'Warehouse',
      'received',
      'Received',
      'initiated',
      'Initiated',
      'pickup scheduled',
      'Pickup Scheduled',
      'in transit',
      'In Transit',
      'quality check',
      'Quality Check',
      'refunded',
      'Refunded',
      'replaced',
      'Replaced',
      'rejected',
      'Rejected'
    ];

    console.log('🧪 Testing status mapping:');
    testCases.forEach(testCase => {
      const result = normalizeStatus(testCase);
      console.log(`  "${testCase}" -> "${result}"`);
    });
  }

  async getAnalyticsData() {
    try {
      // Order trends by month
      const orderTrends = await DropshipOrder.aggregate([
        {
          $match: {
            custOrderDate: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$custOrderDate' },
              month: { $month: '$custOrderDate' }
            },
            orderCount: { $sum: 1 },
            revenue: { $sum: '$invoiceValue' },
            cancellations: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      // Top cancellation reasons
      const cancellationReasons = await RtvReturn.aggregate([
        {
          $match: { returnReason: { $ne: null, $ne: '' } }
        },
        {
          $group: {
            _id: '$returnReason',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 10
        }
      ]);

      // Shipping partner performance
      const partnerPerformance = await DropshipOrder.aggregate([
        {
          $match: { $and: [ { fwdCarrier: { $ne: null } }, { fwdCarrier: { $ne: '' } } ] }
        },
        {
          $group: {
            _id: '$fwdCarrier',
            totalOrders: { $sum: 1 },
            deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } }
          }
        },
        {
          $project: {
            partner: '$_id',
            totalOrders: 1,
            deliveredOrders: 1,
            successRate: {
              $multiply: [
                { $divide: ['$deliveredOrders', '$totalOrders'] },
                100
              ]
            }
          }
        }
      ]);

      // Avg resolution time for returns (days between initiatedDate and expectedDelivery)
      const resolutionAgg = await RtvReturn.aggregate([
        { $match: { initiatedDate: { $ne: null }, expectedDelivery: { $ne: null } } },
        { $project: { diffDays: { $divide: [{ $subtract: ['$expectedDelivery', '$initiatedDate'] }, 1000 * 60 * 60 * 24] } } },
        { $group: { _id: null, avgDays: { $avg: '$diffDays' } } }
      ]);

      // Cost per return proxy: average refund amount
      const costAgg = await RtvReturn.aggregate([
        { $group: { _id: null, avgRefund: { $avg: { $ifNull: ['$refundAmount', 0] } } } }
      ]);

      return {
        orderTrends,
        cancellationReasons,
        partnerPerformance,
        avgResolutionDays: (resolutionAgg[0]?.avgDays || 0),
        costPerReturn: (costAgg[0]?.avgRefund || 0)
      };
    } catch (error) {
      console.error('❌ Error getting analytics data:', error);
      throw error;
    }
  }

  async getTrendsData(range = '30d') {
    try {
      // Validate range parameter
      const validRanges = ['7d', '30d', '90d', 'all'];
      const validRange = validRanges.includes(range) ? range : '30d';
      
      let days = 30;
      if (validRange === '7d') days = 7;
      else if (validRange === '30d') days = 30;
      else if (validRange === '90d') days = 90;
      else days = 365; // all time

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0); // Start of day

      // Get orders grouped by date
      const orderTrends = await DropshipOrder.aggregate([
        {
          $match: {
            custOrderDate: { $gte: startDate, $ne: null }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$custOrderDate' }
            },
            orders: { $sum: 1 },
            delivered: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$status', 'Delivered'] },
                      { $regexMatch: { input: { $toString: '$status' }, regex: /delivered/i } }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            cancelled: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$status', 'Cancelled'] },
                      { $regexMatch: { input: { $toString: '$status' }, regex: /cancel/i } }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            revenue: { $sum: { $ifNull: ['$invoiceValue', 0] } }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Get returns grouped by date
      const returnTrends = await RtvReturn.aggregate([
        {
          $match: {
            initiatedDate: { $gte: startDate, $ne: null }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$initiatedDate' }
            },
            returns: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$status', 'refunded'] },
                      { $eq: ['$status', 'replaced'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Combine and format data
      const dateMap = new Map();
      
      // Add orders
      if (Array.isArray(orderTrends)) {
        orderTrends.forEach(item => {
          if (!item || !item._id) return;
          const date = item._id;
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              fullDate: date,
              orders: 0,
              returns: 0,
              revenue: 0,
              delivered: 0,
              cancelled: 0,
              completed: 0
            });
          }
          const entry = dateMap.get(date);
          if (entry) {
            entry.orders = Number(item.orders || 0);
            entry.delivered = Number(item.delivered || 0);
            entry.cancelled = Number(item.cancelled || 0);
            entry.revenue = Number(item.revenue || 0);
          }
        });
      }

      // Add returns
      if (Array.isArray(returnTrends)) {
        returnTrends.forEach(item => {
          if (!item || !item._id) return;
          const date = item._id;
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              fullDate: date,
              orders: 0,
              returns: 0,
              revenue: 0,
              delivered: 0,
              cancelled: 0,
              completed: 0
            });
          }
          const entry = dateMap.get(date);
          if (entry) {
            entry.returns = Number(item.returns || 0);
            entry.completed = Number(item.completed || 0);
          }
        });
      }

      // Convert to array and fill missing dates
      const result = Array.from(dateMap.values()).sort((a, b) => 
        new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
      );

      return result;
    } catch (error) {
      console.error('❌ Error getting trends data:', error);
      throw error;
    }
  }

  async initializeShippingPartners() {
    try {
      const partners = [
        {
          partnerCode: 'DELHIVERY',
          partnerName: 'Delhivery',
          trackingUrlTemplate: 'https://www.delhivery.com/track/package/{awb}',
          isActive: true
        },
        {
          partnerCode: 'SHADOWFAX',
          partnerName: 'Shadowfax',
          trackingUrlTemplate: 'https://shadowfax.in/track/{awb}',
          isActive: true
        },
        {
          partnerCode: 'XPRESSBEES',
          partnerName: 'Xpressbees',
          trackingUrlTemplate: 'https://www.xpressbees.com/track/{awb}',
          isActive: true
        }
      ];

      for (const partner of partners) {
        await ShippingPartner.findOneAndUpdate(
          { partnerCode: partner.partnerCode },
          partner,
          { upsert: true, new: true }
        );
      }

      console.log('✅ Shipping partners initialized');
    } catch (error) {
      console.error('❌ Error initializing shipping partners:', error);
    }
  }

  // --- Sync helpers: compute and persist ourStatus based on AWB/partner heuristics ---
  async syncReturnsByTracking(options = {}) {
    // Heuristic/live enrichment using partner tracking by AWB
    const cursor = RtvReturn.find({}).cursor();
    let updated = 0;
    const useLive = !!options.live;
    // Batch maps per partner
    const batchAwbsDelhivery = [];
    const idByAwbDelhivery = {};
    const batchAwbsShadowfax = [];
    const idByAwbShadowfax = {};
    const batchAwbsXpress = [];
    const idByAwbXpress = {};
    const batchAwbsBluedart = [];
    const idByAwbBluedart = {};
    const batchAwbsDTDC = [];
    const idByAwbDTDC = {};
    const batchAwbsECOM = [];
    const idByAwbECOM = {};
    const batchAwbsFEDEX = [];
    const idByAwbFEDEX = {};
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      try {
        if (useLive && doc.trackingNumber) {
          if (doc.shippingPartner === 'DELHIVERY') {
            batchAwbsDelhivery.push(doc.trackingNumber);
            idByAwbDelhivery[doc.trackingNumber] = doc._id;
            if (batchAwbsDelhivery.length === 50) {
              if (this.delhiveryToken) {
                updated += await this.applyDelhiveryReturnStatuses(batchAwbsDelhivery, idByAwbDelhivery);
              } else {
                updated += await this.applyDelhiveryHtmlReturnStatuses(batchAwbsDelhivery, idByAwbDelhivery);
              }
              batchAwbsDelhivery.length = 0;
              for (const k in idByAwbDelhivery) delete idByAwbDelhivery[k];
            }
          } else if (doc.shippingPartner === 'SHADOWFAX') {
            batchAwbsShadowfax.push(doc.trackingNumber);
            idByAwbShadowfax[doc.trackingNumber] = doc._id;
            if (batchAwbsShadowfax.length === 25) { // keep smaller for HTML scraping
              updated += await this.applyShadowfaxReturnStatuses(batchAwbsShadowfax, idByAwbShadowfax);
              batchAwbsShadowfax.length = 0;
              for (const k in idByAwbShadowfax) delete idByAwbShadowfax[k];
            }
          } else if (doc.shippingPartner === 'XPRESSBEES') {
            batchAwbsXpress.push(doc.trackingNumber);
            idByAwbXpress[doc.trackingNumber] = doc._id;
            if (batchAwbsXpress.length === 25) {
              updated += await this.applyXpressbeesReturnStatuses(batchAwbsXpress, idByAwbXpress);
              batchAwbsXpress.length = 0; for (const k in idByAwbXpress) delete idByAwbXpress[k];
            }
          } else if (doc.shippingPartner === 'BLUEDART') {
            batchAwbsBluedart.push(doc.trackingNumber);
            idByAwbBluedart[doc.trackingNumber] = doc._id;
            if (batchAwbsBluedart.length === 25) {
              updated += await this.applyBluedartReturnStatuses(batchAwbsBluedart, idByAwbBluedart);
              batchAwbsBluedart.length = 0; for (const k in idByAwbBluedart) delete idByAwbBluedart[k];
            }
          } else if (doc.shippingPartner === 'DTDC') {
            batchAwbsDTDC.push(doc.trackingNumber);
            idByAwbDTDC[doc.trackingNumber] = doc._id;
            if (batchAwbsDTDC.length === 25) {
              updated += await this.applyDTDCReturnStatuses(batchAwbsDTDC, idByAwbDTDC);
              batchAwbsDTDC.length = 0; for (const k in idByAwbDTDC) delete idByAwbDTDC[k];
            }
          } else if (doc.shippingPartner === 'ECOM') {
            batchAwbsECOM.push(doc.trackingNumber);
            idByAwbECOM[doc.trackingNumber] = doc._id;
            if (batchAwbsECOM.length === 25) {
              updated += await this.applyECOMReturnStatuses(batchAwbsECOM, idByAwbECOM);
              batchAwbsECOM.length = 0; for (const k in idByAwbECOM) delete idByAwbECOM[k];
            }
          } else if (doc.shippingPartner === 'FEDEX') {
            batchAwbsFEDEX.push(doc.trackingNumber);
            idByAwbFEDEX[doc.trackingNumber] = doc._id;
            if (batchAwbsFEDEX.length === 10) {
              updated += await this.applyFEDEXReturnStatuses(batchAwbsFEDEX, idByAwbFEDEX);
              batchAwbsFEDEX.length = 0; for (const k in idByAwbFEDEX) delete idByAwbFEDEX[k];
            }
          }
        } else {
          const threePl = (((doc.rawRow || {})['3PL Delivery Status']) || '').toString().toLowerCase();
          let ourStatus = 'INITIATED';
          if ((doc.status || '').toString().toLowerCase().includes('refund')) {
            ourStatus = 'REFUNDED';
          } else if (threePl.includes('deliver')) {
            ourStatus = 'RETURN_DELIVERED';
          } else if (doc.trackingNumber) {
            ourStatus = 'IN_TRANSIT';
          }
          if (doc.ourStatus !== ourStatus) {
            await RtvReturn.updateOne({ _id: doc._id }, { $set: { ourStatus, ourStatusUpdatedAt: new Date() } });
            updated++;
          }
        }
      } catch (e) {
        // continue
      }
    }
    if (useLive && batchAwbsDelhivery.length) {
      if (this.delhiveryToken) {
        updated += await this.applyDelhiveryReturnStatuses(batchAwbsDelhivery, idByAwbDelhivery);
      } else {
        updated += await this.applyDelhiveryHtmlReturnStatuses(batchAwbsDelhivery, idByAwbDelhivery);
      }
    }
    if (useLive && batchAwbsShadowfax.length) {
      updated += await this.applyShadowfaxReturnStatuses(batchAwbsShadowfax, idByAwbShadowfax);
    }
    if (useLive && batchAwbsXpress.length) {
      updated += await this.applyXpressbeesReturnStatuses(batchAwbsXpress, idByAwbXpress);
    }
    if (useLive && batchAwbsBluedart.length) {
      updated += await this.applyBluedartReturnStatuses(batchAwbsBluedart, idByAwbBluedart);
    }
    if (useLive && batchAwbsDTDC.length) {
      updated += await this.applyDTDCReturnStatuses(batchAwbsDTDC, idByAwbDTDC);
    }
    if (useLive && batchAwbsECOM.length) {
      updated += await this.applyECOMReturnStatuses(batchAwbsECOM, idByAwbECOM);
    }
    if (useLive && batchAwbsFEDEX.length) {
      updated += await this.applyFEDEXReturnStatuses(batchAwbsFEDEX, idByAwbFEDEX);
    }
    return { updated };
  }

  async syncOrdersByTracking(options = {}) {
    // Heuristic for orders: if status Delivered keep Delivered; if AWB present and not Cancelled -> Shipped; else keep status
    const cursor = DropshipOrder.find({}).cursor();
    let updated = 0;
    const useLive = !!options.live;
    const batchAwbsDelhivery = [];
    const idByAwbDelhivery = {};
    const batchAwbsShadowfax = [];
    const idByAwbShadowfax = {};
    const batchAwbsXpress = [];
    const idByAwbXpress = {};
    const batchAwbsBluedart = [];
    const idByAwbBluedart = {};
    const batchAwbsDTDC = [];
    const idByAwbDTDC = {};
    const batchAwbsECOM = [];
    const idByAwbECOM = {};
    const batchAwbsFEDEX = [];
    const idByAwbFEDEX = {};
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      try {
        if (useLive && doc.fwdAwb) {
          if (doc.fwdCarrier === 'DELHIVERY') {
            batchAwbsDelhivery.push(doc.fwdAwb);
            idByAwbDelhivery[doc.fwdAwb] = doc._id;
            if (batchAwbsDelhivery.length === 50) {
              if (this.delhiveryToken) {
                updated += await this.applyDelhiveryOrderStatuses(batchAwbsDelhivery, idByAwbDelhivery);
              } else {
                updated += await this.applyDelhiveryHtmlOrderStatuses(batchAwbsDelhivery, idByAwbDelhivery);
              }
              batchAwbsDelhivery.length = 0;
              for (const k in idByAwbDelhivery) delete idByAwbDelhivery[k];
            }
          } else if (doc.fwdCarrier === 'SHADOWFAX') {
            batchAwbsShadowfax.push(doc.fwdAwb);
            idByAwbShadowfax[doc.fwdAwb] = doc._id;
            if (batchAwbsShadowfax.length === 25) {
              updated += await this.applyShadowfaxOrderStatuses(batchAwbsShadowfax, idByAwbShadowfax);
              batchAwbsShadowfax.length = 0;
              for (const k in idByAwbShadowfax) delete idByAwbShadowfax[k];
            }
          } else if (doc.fwdCarrier === 'XPRESSBEES') {
            batchAwbsXpress.push(doc.fwdAwb);
            idByAwbXpress[doc.fwdAwb] = doc._id;
            if (batchAwbsXpress.length === 25) {
              updated += await this.applyXpressbeesOrderStatuses(batchAwbsXpress, idByAwbXpress);
              batchAwbsXpress.length = 0; for (const k in idByAwbXpress) delete idByAwbXpress[k];
            }
          } else if (doc.fwdCarrier === 'BLUEDART') {
            batchAwbsBluedart.push(doc.fwdAwb);
            idByAwbBluedart[doc.fwdAwb] = doc._id;
            if (batchAwbsBluedart.length === 25) {
              updated += await this.applyBluedartOrderStatuses(batchAwbsBluedart, idByAwbBluedart);
              batchAwbsBluedart.length = 0; for (const k in idByAwbBluedart) delete idByAwbBluedart[k];
            }
          } else if (doc.fwdCarrier === 'DTDC') {
            batchAwbsDTDC.push(doc.fwdAwb);
            idByAwbDTDC[doc.fwdAwb] = doc._id;
            if (batchAwbsDTDC.length === 25) {
              updated += await this.applyDTDCOrderStatuses(batchAwbsDTDC, idByAwbDTDC);
              batchAwbsDTDC.length = 0; for (const k in idByAwbDTDC) delete idByAwbDTDC[k];
            }
          } else if (doc.fwdCarrier === 'ECOM') {
            batchAwbsECOM.push(doc.fwdAwb);
            idByAwbECOM[doc.fwdAwb] = doc._id;
            if (batchAwbsECOM.length === 25) {
              updated += await this.applyECOMOrderStatuses(batchAwbsECOM, idByAwbECOM);
              batchAwbsECOM.length = 0; for (const k in idByAwbECOM) delete idByAwbECOM[k];
            }
          } else if (doc.fwdCarrier === 'FEDEX') {
            batchAwbsFEDEX.push(doc.fwdAwb);
            idByAwbFEDEX[doc.fwdAwb] = doc._id;
            if (batchAwbsFEDEX.length === 10) {
              updated += await this.applyFEDEXOrderStatuses(batchAwbsFEDEX, idByAwbFEDEX);
              batchAwbsFEDEX.length = 0; for (const k in idByAwbFEDEX) delete idByAwbFEDEX[k];
            }
          }
        } else {
          let ourStatus = doc.status || '';
          const s = (ourStatus || '').toLowerCase();
          if (s.includes('delivered')) {
            ourStatus = 'Delivered';
          } else if (!s.includes('cancel') && doc.fwdAwb) {
            ourStatus = 'Shipped';
          }
          if (doc.normalizedStatus !== ourStatus) {
            await DropshipOrder.updateOne({ _id: doc._id }, { $set: { normalizedStatus: ourStatus, normalizedStatusUpdatedAt: new Date() } });
            updated++;
          }
        }
      } catch (e) {
        // continue
      }
    }
    if (useLive && batchAwbsDelhivery.length) {
      if (this.delhiveryToken) {
        updated += await this.applyDelhiveryOrderStatuses(batchAwbsDelhivery, idByAwbDelhivery);
      } else {
        updated += await this.applyDelhiveryHtmlOrderStatuses(batchAwbsDelhivery, idByAwbDelhivery);
      }
    }
    if (useLive && batchAwbsShadowfax.length) {
      updated += await this.applyShadowfaxOrderStatuses(batchAwbsShadowfax, idByAwbShadowfax);
    }
    if (useLive && batchAwbsXpress.length) {
      updated += await this.applyXpressbeesOrderStatuses(batchAwbsXpress, idByAwbXpress);
    }
    if (useLive && batchAwbsBluedart.length) {
      updated += await this.applyBluedartOrderStatuses(batchAwbsBluedart, idByAwbBluedart);
    }
    if (useLive && batchAwbsDTDC.length) {
      updated += await this.applyDTDCOrderStatuses(batchAwbsDTDC, idByAwbDTDC);
    }
    if (useLive && batchAwbsECOM.length) {
      updated += await this.applyECOMOrderStatuses(batchAwbsECOM, idByAwbECOM);
    }
    if (useLive && batchAwbsFEDEX.length) {
      updated += await this.applyFEDEXOrderStatuses(batchAwbsFEDEX, idByAwbFEDEX);
    }
    return { updated };
  }

  // --- External provider integrations ---
  async fetchDelhiveryStatuses(awbs = []) {
    if (!this.delhiveryToken) return {};
    const unique = Array.from(new Set(awbs.filter(Boolean)));
    if (unique.length === 0) return {};
    const query = new URL(this.delhiveryBaseUrl);
    query.searchParams.set('waybill', unique.join(','));
    query.searchParams.set('ref_ids', '');
    const resp = await fetch(query.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Token ${this.delhiveryToken}`,
        'Content-Type': 'application/json'
      }
    });
    if (!resp.ok) return {};
    const data = await resp.json();
    // Expect data.ShipmentData: [{ Shipment: { AWB, Scans: [...], Status: { Status } } }]
    const map = {};
    try {
      const list = data.ShipmentData || data.shipmentData || [];
      for (const entry of list) {
        const s = entry.Shipment || entry.shipment || {};
        const awb = s.AWB || s.Awb || s.Waybill || s.waybill || '';
        const status = (s.Status && (s.Status.Status || s.Status.status)) || s.CurrentStatus || '';
        map[String(awb)] = String(status || '');
      }
    } catch {}
    return map;
  }

  mapDelhiveryToReturnStatus(status = '') {
    const s = status.toLowerCase();
    if (s.includes('deliver')) return 'RETURN_DELIVERED';
    if (s.includes('out for') || s.includes('in transit') || s.includes('transit') || s.includes('received')) return 'IN_TRANSIT';
    if (s.includes('pickup')) return 'pickup_scheduled';
    if (s.includes('cancel')) return 'rejected';
    return 'initiated';
  }

  mapDelhiveryToOrderStatus(status = '') {
    const s = status.toLowerCase();
    if (s.includes('deliver')) return 'Delivered';
    if (s.includes('out for') || s.includes('in transit') || s.includes('transit') || s.includes('received')) return 'Shipped';
    if (s.includes('cancel')) return 'Cancelled';
    return 'Shipped';
  }

  // --- Delhivery HTML fallback (no token) ---
  async fetchDelhiveryHtmlStatuses(awbs = [], concurrency = 5) {
    const unique = Array.from(new Set(awbs.filter(Boolean)));
    const map = {};
    let index = 0;
    const runner = async () => {
      while (index < unique.length) {
        const i = index++;
        const awb = unique[i];
        try {
          const url = `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}`;
          const resp = await fetch(url, { method: 'GET' });
          const html = await resp.text();
          map[awb] = html || '';
        } catch (_) {
          map[awb] = '';
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, runner));
    return map;
  }

  mapDelhiveryHtmlToReturnStatus(html = '') {
    const s = (html || '').toLowerCase();
    if (s.includes('delivered on') || s.includes('delivered')) return 'RETURN_DELIVERED';
    if (s.includes('out for delivery') || s.includes('ofd') || s.includes('in transit') || s.includes('shipment received') || s.includes('received at')) return 'IN_TRANSIT';
    if (s.includes('pickup') || s.includes('picked up')) return 'pickup_scheduled';
    if (s.includes('cancel')) return 'rejected';
    return 'IN_TRANSIT';
  }

  mapDelhiveryHtmlToOrderStatus(html = '') {
    const s = (html || '').toLowerCase();
    if (s.includes('delivered on') || s.includes('delivered')) return 'Delivered';
    if (s.includes('out for delivery') || s.includes('ofd') || s.includes('in transit') || s.includes('shipment received') || s.includes('received at')) return 'Shipped';
    if (s.includes('cancel')) return 'Cancelled';
    return 'Shipped';
  }

  async applyDelhiveryHtmlReturnStatuses(awbs, idByAwb) {
    const htmlMap = await this.fetchDelhiveryHtmlStatuses(awbs);
    let updated = 0;
    for (const awb of Object.keys(htmlMap)) {
      const our = this.mapDelhiveryHtmlToReturnStatus(htmlMap[awb]);
      const id = idByAwb[awb];
      if (id) {
        await RtvReturn.updateOne({ _id: id }, { $set: { ourStatus: our, ourStatusUpdatedAt: new Date() } });
        updated++;
      }
    }
    return updated;
  }

  async applyDelhiveryHtmlOrderStatuses(awbs, idByAwb) {
    const htmlMap = await this.fetchDelhiveryHtmlStatuses(awbs);
    let updated = 0;
    for (const awb of Object.keys(htmlMap)) {
      const our = this.mapDelhiveryHtmlToOrderStatus(htmlMap[awb]);
      const id = idByAwb[awb];
      if (id) {
        await DropshipOrder.updateOne({ _id: id }, { $set: { normalizedStatus: our, normalizedStatusUpdatedAt: new Date() } });
        updated++;
      }
    }
    return updated;
  }

  // --- SHADOWFAX provider (HTML scraping) ---
  async fetchShadowfaxStatuses(awbs = []) {
    const unique = Array.from(new Set(awbs.filter(Boolean)));
    const map = {};
    const concurrency = 5;
    let index = 0;
    const run = async () => {
      while (index < unique.length) {
        const i = index++;
        const awb = unique[i];
        try {
          const url = `https://shadowfax.in/track/${encodeURIComponent(awb)}`;
          const resp = await fetch(url, { method: 'GET' });
          const html = await resp.text();
          map[awb] = html || '';
        } catch (_) {
          map[awb] = '';
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, run));
    return map;
  }

  mapShadowfaxToReturnStatus(html = '') {
    const s = (html || '').toLowerCase();
    if (s.includes('delivered')) return 'RETURN_DELIVERED';
    if (s.includes('out for delivery') || s.includes('ofd')) return 'IN_TRANSIT';
    if (s.includes('shipment has been received') || s.includes('shipment received') || s.includes('received at') || s.includes('facility')) return 'IN_TRANSIT';
    if (s.includes('pickup') || s.includes('picked up')) return 'pickup_scheduled';
    if (s.includes('cancel')) return 'rejected';
    return 'IN_TRANSIT';
  }

  mapShadowfaxToOrderStatus(html = '') {
    const s = (html || '').toLowerCase();
    if (s.includes('delivered')) return 'Delivered';
    if (s.includes('out for delivery') || s.includes('ofd') || s.includes('in transit') || s.includes('received')) return 'Shipped';
    if (s.includes('cancel')) return 'Cancelled';
    return 'Shipped';
  }

  async applyShadowfaxReturnStatuses(awbs, idByAwb) {
    const htmlMap = await this.fetchShadowfaxStatuses(awbs);
    let updated = 0;
    for (const awb of Object.keys(htmlMap)) {
      const our = this.mapShadowfaxToReturnStatus(htmlMap[awb]);
      const id = idByAwb[awb];
      if (id) {
        await RtvReturn.updateOne({ _id: id }, { $set: { ourStatus: our, ourStatusUpdatedAt: new Date() } });
        updated++;
      }
    }
    return updated;
  }

  async applyShadowfaxOrderStatuses(awbs, idByAwb) {
    const htmlMap = await this.fetchShadowfaxStatuses(awbs);
    let updated = 0;
    for (const awb of Object.keys(htmlMap)) {
      const our = this.mapShadowfaxToOrderStatus(htmlMap[awb]);
      const id = idByAwb[awb];
      if (id) {
        await DropshipOrder.updateOne({ _id: id }, { $set: { normalizedStatus: our, normalizedStatusUpdatedAt: new Date() } });
        updated++;
      }
    }
    return updated;
  }

  async applyDelhiveryReturnStatuses(awbs, idByAwb) {
    if (!this.delhiveryToken) return 0;
    const statusMap = await this.fetchDelhiveryStatuses(awbs);
    let updated = 0;
    for (const awb of Object.keys(statusMap)) {
      const our = this.mapDelhiveryToReturnStatus(statusMap[awb]);
      const id = idByAwb[awb];
      if (id) {
        await RtvReturn.updateOne({ _id: id }, { $set: { ourStatus: our, ourStatusUpdatedAt: new Date() } });
        updated++;
      }
    }
    return updated;
  }

  async applyDelhiveryOrderStatuses(awbs, idByAwb) {
    if (!this.delhiveryToken) return 0;
    const statusMap = await this.fetchDelhiveryStatuses(awbs);
    let updated = 0;
    for (const awb of Object.keys(statusMap)) {
      const our = this.mapDelhiveryToOrderStatus(statusMap[awb]);
      const id = idByAwb[awb];
      if (id) {
        await DropshipOrder.updateOne({ _id: id }, { $set: { normalizedStatus: our, normalizedStatusUpdatedAt: new Date() } });
        updated++;
      }
    }
    return updated;
  }

  // --- Generic HTML helpers for partners without APIs ---
  async fetchHtmlStatuses(urlBuilder, awbs = [], concurrency = 5) {
    const unique = Array.from(new Set(awbs.filter(Boolean)));
    const map = {};
    let index = 0;
    const runner = async () => {
      while (index < unique.length) {
        const i = index++;
        const awb = unique[i];
        const url = urlBuilder(awb);
        try {
          const resp = await fetch(url, { method: 'GET' });
          const html = await resp.text();
          map[awb] = html || '';
        } catch (_) {
          map[awb] = '';
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, runner));
    return map;
  }

  mapGenericHtmlToReturnStatus(html = '') {
    const s = (html || '').toLowerCase();
    if (s.includes('delivered') || s.includes('delivery completed') || s.includes('successfully delivered')) return 'RETURN_DELIVERED';
    if (s.includes('out for delivery') || s.includes('ofd') || s.includes('in transit') || s.includes('received at') || s.includes('arrival') || s.includes('arrived') || s.includes('facility') || s.includes('shipment received')) return 'IN_TRANSIT';
    if (s.includes('pickup') || s.includes('picked up')) return 'pickup_scheduled';
    if (s.includes('cancel')) return 'rejected';
    return 'IN_TRANSIT';
  }

  mapGenericHtmlToOrderStatus(html = '') {
    const s = (html || '').toLowerCase();
    if (s.includes('delivered')) return 'Delivered';
    if (s.includes('out for delivery') || s.includes('ofd') || s.includes('in transit') || s.includes('received') || s.includes('arrival') || s.includes('arrived')) return 'Shipped';
    if (s.includes('cancel')) return 'Cancelled';
    return 'Shipped';
  }

  // XPRESSBEES
  async applyXpressbeesReturnStatuses(awbs, idByAwb) {
    const map = await this.fetchHtmlStatuses((awb) => `https://www.xpressbees.com/track?isawb=Yes&track=${encodeURIComponent(awb)}`, awbs);
    let updated = 0;
    for (const awb of Object.keys(map)) {
      const our = this.mapGenericHtmlToReturnStatus(map[awb]);
      const id = idByAwb[awb];
      if (id) { await RtvReturn.updateOne({ _id: id }, { $set: { ourStatus: our, ourStatusUpdatedAt: new Date() } }); updated++; }
    }
    return updated;
  }
  async applyXpressbeesOrderStatuses(awbs, idByAwb) {
    const map = await this.fetchHtmlStatuses((awb) => `https://www.xpressbees.com/track?isawb=Yes&track=${encodeURIComponent(awb)}`, awbs);
    let updated = 0;
    for (const awb of Object.keys(map)) {
      const our = this.mapGenericHtmlToOrderStatus(map[awb]);
      const id = idByAwb[awb];
      if (id) { await DropshipOrder.updateOne({ _id: id }, { $set: { normalizedStatus: our, normalizedStatusUpdatedAt: new Date() } }); updated++; }
    }
    return updated;
  }

  // BLUEDART
  async applyBluedartReturnStatuses(awbs, idByAwb) {
    const map = await this.fetchHtmlStatuses((awb) => `https://www.bluedart.com/track?track=${encodeURIComponent(awb)}`, awbs);
    let updated = 0;
    for (const awb of Object.keys(map)) {
      const our = this.mapGenericHtmlToReturnStatus(map[awb]);
      const id = idByAwb[awb];
      if (id) { await RtvReturn.updateOne({ _id: id }, { $set: { ourStatus: our, ourStatusUpdatedAt: new Date() } }); updated++; }
    }
    return updated;
  }
  async applyBluedartOrderStatuses(awbs, idByAwb) {
    const map = await this.fetchHtmlStatuses((awb) => `https://www.bluedart.com/track?track=${encodeURIComponent(awb)}`, awbs);
    let updated = 0;
    for (const awb of Object.keys(map)) {
      const our = this.mapGenericHtmlToOrderStatus(map[awb]);
      const id = idByAwb[awb];
      if (id) { await DropshipOrder.updateOne({ _id: id }, { $set: { normalizedStatus: our, normalizedStatusUpdatedAt: new Date() } }); updated++; }
    }
    return updated;
  }

  // DTDC
  async applyDTDCReturnStatuses(awbs, idByAwb) {
    const map = await this.fetchHtmlStatuses((awb) => `https://www.dtdc.in/tracking.aspx?strCnno=${encodeURIComponent(awb)}`, awbs);
    let updated = 0;
    for (const awb of Object.keys(map)) {
      const our = this.mapGenericHtmlToReturnStatus(map[awb]);
      const id = idByAwb[awb];
      if (id) { await RtvReturn.updateOne({ _id: id }, { $set: { ourStatus: our, ourStatusUpdatedAt: new Date() } }); updated++; }
    }
    return updated;
  }
  async applyDTDCOrderStatuses(awbs, idByAwb) {
    const map = await this.fetchHtmlStatuses((awb) => `https://www.dtdc.in/tracking.aspx?strCnno=${encodeURIComponent(awb)}`, awbs);
    let updated = 0;
    for (const awb of Object.keys(map)) {
      const our = this.mapGenericHtmlToOrderStatus(map[awb]);
      const id = idByAwb[awb];
      if (id) { await DropshipOrder.updateOne({ _id: id }, { $set: { normalizedStatus: our, normalizedStatusUpdatedAt: new Date() } }); updated++; }
    }
    return updated;
  }

  // ECOM EXPRESS
  async applyECOMReturnStatuses(awbs, idByAwb) {
    const map = await this.fetchHtmlStatuses((awb) => `https://ecomexpress.in/tracking/?awb=${encodeURIComponent(awb)}`, awbs);
    let updated = 0;
    for (const awb of Object.keys(map)) {
      const our = this.mapGenericHtmlToReturnStatus(map[awb]);
      const id = idByAwb[awb];
      if (id) { await RtvReturn.updateOne({ _id: id }, { $set: { ourStatus: our, ourStatusUpdatedAt: new Date() } }); updated++; }
    }
    return updated;
  }
  async applyECOMOrderStatuses(awbs, idByAwb) {
    const map = await this.fetchHtmlStatuses((awb) => `https://ecomexpress.in/tracking/?awb=${encodeURIComponent(awb)}`, awbs);
    let updated = 0;
    for (const awb of Object.keys(map)) {
      const our = this.mapGenericHtmlToOrderStatus(map[awb]);
      const id = idByAwb[awb];
      if (id) { await DropshipOrder.updateOne({ _id: id }, { $set: { normalizedStatus: our, normalizedStatusUpdatedAt: new Date() } }); updated++; }
    }
    return updated;
  }

  // FEDEX (best-effort HTML)
  async applyFEDEXReturnStatuses(awbs, idByAwb) {
    const map = await this.fetchHtmlStatuses((awb) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(awb)}`, awbs, 3);
    let updated = 0;
    for (const awb of Object.keys(map)) {
      const our = this.mapGenericHtmlToReturnStatus(map[awb]);
      const id = idByAwb[awb];
      if (id) { await RtvReturn.updateOne({ _id: id }, { $set: { ourStatus: our, ourStatusUpdatedAt: new Date() } }); updated++; }
    }
    return updated;
  }
  async applyFEDEXOrderStatuses(awbs, idByAwb) {
    const map = await this.fetchHtmlStatuses((awb) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(awb)}`, awbs, 3);
    let updated = 0;
    for (const awb of Object.keys(map)) {
      const our = this.mapGenericHtmlToOrderStatus(map[awb]);
      const id = idByAwb[awb];
      if (id) { await DropshipOrder.updateOne({ _id: id }, { $set: { normalizedStatus: our, normalizedStatusUpdatedAt: new Date() } }); updated++; }
    }
    return updated;
  }
}

module.exports = new ReportProcessor();