import React from 'react';
import { Truck, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { ShippingPartner } from '../../types/dashboard';

interface ShippingPartnersProps {
  partners: ShippingPartner[];
}

export const ShippingPartners: React.FC<ShippingPartnersProps> = ({ partners }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Shipping Partners
        </h2>
      </div>

      <div className="space-y-4">
        {partners.map((partner) => (
          <div key={partner.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{partner.logo}</div>
              <div>
                <h3 className="font-medium text-gray-900">{partner.name}</h3>
                <p className="text-sm text-gray-500">{partner.activeReturns} active returns</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{partner.averageDeliveryTime} days</span>
                </div>
                <p className="text-xs text-gray-500">Avg delivery</p>
              </div>

              <div className="text-center">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{partner.successRate}%</span>
                </div>
                <p className="text-xs text-gray-500">Success rate</p>
              </div>

              <div className="text-center">
                <div className={`flex items-center gap-1 ${
                  partner.status === 'active' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {partner.status === 'active' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="capitalize">{partner.status}</span>
                </div>
                <p className="text-xs text-gray-500">Status</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};