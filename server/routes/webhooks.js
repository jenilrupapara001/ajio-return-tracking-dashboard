const express = require('express');
const router = express.Router();
const delhiveryService = require('../services/delhiveryService');
const DropshipOrder = require('../models/DropshipOrder');
const RtvReturn = require('../models/RtvReturn');

// Delhivery webhook endpoint
router.post('/delhivery', async (req, res) => {
  try {
    console.log('Received Delhivery webhook:', req.body);
    
    const webhookData = delhiveryService.processWebhookData(req.body);
    
    // Update order status in database
    if (webhookData.awbNumber) {
      await updateOrderStatus(webhookData.awbNumber, webhookData.status, webhookData);
    }
    
    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing Delhivery webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update order status based on tracking data
async function updateOrderStatus(awbNumber, status, webhookData) {
  try {
    // Update DropshipOrder
    const orderUpdate = await DropshipOrder.findOneAndUpdate(
      { fwdAwb: awbNumber },
      {
        $set: {
          status: status,
          lastTrackingUpdate: new Date(),
          trackingData: webhookData
        }
      },
      { new: true }
    );

    // Update RtvReturn if exists
    const returnUpdate = await RtvReturn.findOneAndUpdate(
      { trackingNumber: awbNumber },
      {
        $set: {
          status: status,
          lastTrackingUpdate: new Date(),
          trackingData: webhookData
        }
      },
      { new: true }
    );

    console.log(`Updated order status for AWB ${awbNumber}:`, { orderUpdate: !!orderUpdate, returnUpdate: !!returnUpdate });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

// Manual status update endpoint
router.post('/update-status', async (req, res) => {
  try {
    const { awbNumber, status, location, remarks } = req.body;
    
    if (!awbNumber || !status) {
      return res.status(400).json({ success: false, message: 'AWB number and status are required' });
    }

    await updateOrderStatus(awbNumber, status, {
      location,
      remarks,
      timestamp: new Date()
    });

    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get tracking status for multiple AWBs
router.get('/tracking-status', async (req, res) => {
  try {
    const { awbNumbers } = req.query;
    
    if (!awbNumbers) {
      return res.status(400).json({ success: false, message: 'AWB numbers are required' });
    }

    const awbList = Array.isArray(awbNumbers) ? awbNumbers : awbNumbers.split(',');
    const statusData = await delhiveryService.getDeliveryStatus(awbList);
    
    res.json({ success: true, data: statusData });
  } catch (error) {
    console.error('Error getting tracking status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
