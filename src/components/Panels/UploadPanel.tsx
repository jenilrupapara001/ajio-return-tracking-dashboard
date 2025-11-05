import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Database, BarChart3 } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  recordsProcessed?: number;
}

interface ProcessedFile {
  id: number;
  original_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  processed: boolean;
  report_type: string;
  records_processed: number;
}

export const UploadPanel: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [targetTable, setTargetTable] = useState<'dropship_order' | 'rtv_return' | 'unknown'>('dropship_order');

  useEffect(() => {
    fetchProcessedFiles();
  }, []);

  const fetchProcessedFiles = async () => {
    try {
      const response = await fetch('/files', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const files = await response.json();
        // Normalize API -> UI shape
        const normalized: ProcessedFile[] = files.map((f: any) => ({
          id: f._id || f.id,
          original_name: f.originalName || f.original_name || f.filename || 'Unknown',
          file_type: f.fileType || f.file_type || '',
          file_size: f.fileSize || f.file_size || 0,
          upload_date: f.createdAt || f.upload_date || new Date().toISOString(),
          processed: Boolean(f.processed ?? (f.processingStatus === 'completed')),
          report_type: (f.reportType || f.report_type || 'unknown'),
          records_processed: f.recordsProcessed || f.records_processed || 0
        }));
        setProcessedFiles(normalized);
      }
    } catch (error: any) {
      console.error('Failed to fetch processed files:', error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    files.forEach(file => {
      const fileId = Math.random().toString(36).substr(2, 9);
      const uploadFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0
      };

      setUploadedFiles(prev => [...prev, uploadFile]);
      uploadFileToServer(fileId, file);
    });
  };

  const uploadFileToServer = async (fileId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Determine report type based on filename
    let reportType = 'unknown';
    const fileName = file.name.toLowerCase();
    if (fileName.includes('dropship') && fileName.includes('order')) {
      reportType = 'dropship_order';
    } else if (fileName.includes('rtv') || fileName.includes('return')) {
      reportType = 'rtv_return';
    }
    // Allow user override via selector
    formData.append('type', targetTable || reportType);

    try {
      // Simulate progress
      for (let progress = 0; progress <= 90; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { ...f, progress } : f)
        );
      }

      const response = await fetch('/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { 
            ...f, 
            status: 'success', 
            progress: 100,
            recordsProcessed: result.recordsProcessed 
          } : f)
        );
        
        // Refresh processed files list
        fetchProcessedFiles();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (error: any) {
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileId ? { 
          ...f, 
          status: 'error', 
          error: error.message || 'Upload failed. Please try again.' 
        } : f)
      );
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'dropship_order':
        return 'bg-blue-100 text-blue-800';
      case 'rtv_return':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Ajio Reports</h1>
        <p className="text-gray-600 mt-2">Upload and process Ajio Seller Central reports with real-time data storage</p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="text-left">
            <h3 className="text-lg font-medium text-gray-900 mb-1">Target table</h3>
            <p className="text-sm text-gray-600">Choose where to store the uploaded data</p>
          </div>
          <select
            value={targetTable}
            onChange={(e) => setTargetTable(e.target.value as any)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="dropship_order">Dropship Orders</option>
            <option value="rtv_return">RTV Returns</option>
            <option value="unknown">Auto-detect</option>
          </select>
        </div>
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Drop Ajio reports here or click to upload
        </h3>
        <p className="text-gray-600 mb-4">
          Supports CSV and Excel files from Ajio Seller Central
        </p>
        <input
          type="file"
          multiple
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
        >
          <Upload className="h-4 w-4" />
          Select Files
        </label>
      </div>

      {/* Supported Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Dropship Order Reports</h4>
          </div>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Customer Order Numbers (multiple SKUs supported)</li>
            <li>• Forward Seller Order Numbers</li>
            <li>• Invoice generation tracking</li>
            <li>• Pre/Post invoice cancellations</li>
            <li>• AWB numbers for shipping verification</li>
            <li>• Complete order lifecycle data</li>
          </ul>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-orange-600" />
            <h4 className="font-medium text-orange-900">RTV Return Reports</h4>
          </div>
          <ul className="text-sm text-orange-800 space-y-1">
            <li>• Return tracking and status updates</li>
            <li>• Customer return reasons analysis</li>
            <li>• Refund amount calculations</li>
            <li>• Shipping partner performance</li>
            <li>• Return processing timelines</li>
            <li>• Quality check workflows</li>
          </ul>
        </div>
      </div>

      {/* Current Upload Progress */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Progress</h3>
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Processing...</span>
                        <span>{file.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {file.status === 'success' && file.recordsProcessed && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {file.recordsProcessed} records processed successfully
                    </p>
                  )}
                  
                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-red-600 mt-1">{file.error}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {file.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previously Processed Files */}
      {processedFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Previously Processed Files</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-blue-500 mr-3" />
                        <span className="text-sm font-medium text-gray-900">{file.original_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getReportTypeColor(file.report_type || 'unknown')}`}>
                        {(file.report_type || 'unknown').replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {file.records_processed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(file.upload_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        file.processed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {file.processed ? 'Processed' : 'Processing'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Processing Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-3">File Processing Details:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h5 className="font-medium mb-2">Dropship Order Reports:</h5>
            <ul className="space-y-1">
              <li>• Handles multiple SKUs with same Customer Order No</li>
              <li>• Tracks invoice generation status</li>
              <li>• Identifies pre/post invoice cancellations</li>
              <li>• Stores AWB numbers for shipping verification</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Data Storage:</h5>
            <ul className="space-y-1">
              <li>• All data stored in SQL Server database</li>
              <li>• Real-time dashboard updates</li>
              <li>• Advanced filtering and search capabilities</li>
              <li>• Cross-reference with shipping partners</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};