// Form to submit external royalty reports
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useSubmitRoyaltyReport } from '../../hooks/useRoyalties';
import type { ExternalRoyaltyReport } from '../../services/royaltiesApi';

interface Props {
  artistId: string;
  onSuccess?: () => void;
}

const ExternalReportForm: React.FC<Props> = ({ artistId, onSuccess }) => {
  const { submitReport, loading, error, response, reset } = useSubmitRoyaltyReport();

  const [formData, setFormData] = useState<{
    platform: string;
    streams: string;
    revenue: string;
    period_start: string;
    period_end: string;
  }>({
    platform: 'spotify',
    streams: '',
    revenue: '',
    period_start: '',
    period_end: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const report: ExternalRoyaltyReport = {
      artist_id: artistId,
      platform: formData.platform,
      streams: parseInt(formData.streams) || 0,
      revenue: parseFloat(formData.revenue) || 0,
      period_start: formData.period_start,
      period_end: formData.period_end,
      tracks: [], // Could be expanded to include track details
    };

    try {
      await submitReport(report);
      // Reset form on success
      setFormData({
        platform: 'spotify',
        streams: '',
        revenue: '',
        period_start: '',
        period_end: '',
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      // Error is already handled by the hook
    }
  };

  const handleReset = () => {
    reset();
    setFormData({
      platform: 'spotify',
      streams: '',
      revenue: '',
      period_start: '',
      period_end: '',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Submit External Royalty Report
      </h3>

      {response?.success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg"
        >
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">{response.message}</p>
              <p className="text-sm">Report ID: {response.report_id}</p>
              <p className="text-sm">Total Revenue: ${response.total_revenue_processed.toFixed(2)}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-2 text-sm text-green-700 underline"
          >
            Submit another report
          </button>
        </motion.div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Error submitting report</p>
              <p className="text-sm">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platform
          </label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            required
          >
            <option value="spotify">Spotify</option>
            <option value="apple_music">Apple Music</option>
            <option value="youtube">YouTube</option>
            <option value="tidal">Tidal</option>
            <option value="deezer">Deezer</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Streams */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Streams
          </label>
          <input
            type="number"
            value={formData.streams}
            onChange={(e) => setFormData({ ...formData, streams: e.target.value })}
            placeholder="e.g., 125000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            required
            min="0"
          />
        </div>

        {/* Revenue */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Revenue ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.revenue}
            onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
            placeholder="e.g., 500.00"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            required
            min="0"
          />
        </div>

        {/* Period Start */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Period Start Date
          </label>
          <input
            type="date"
            value={formData.period_start}
            onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            required
          />
        </div>

        {/* Period End */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Period End Date
          </label>
          <input
            type="date"
            value={formData.period_end}
            onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || response?.success}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
            loading || response?.success
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Submitting...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Submit Report
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ExternalReportForm;

