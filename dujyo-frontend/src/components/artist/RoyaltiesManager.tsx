import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Download,
  TrendingUp,
  PieChart,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Music,
  Filter,
  Search,
  Coins,
  Activity,
  ExternalLink,
  RefreshCw,
  Settings,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Loader,
  Link as LinkIcon,
  Banknote
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useBlockchain } from '../../contexts/BlockchainContext';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';
import { getApiBaseUrl } from '../../utils/apiConfig';

// Stream-to-Earn specific interfaces
interface StreamEarning {
  id: string;
  timestamp: Date;
  streams: number;
  dyoTokens: number;
  platform: string;
  songId: string;
  songTitle: string;
  status: 'pending' | 'processed' | 'paid';
  transactionHash?: string;
  blockNumber?: number;
}

interface RoyaltySplit {
  id: string;
  songId: string;
  songTitle: string;
  collaboratorWallet: string;
  collaboratorName: string;
  percentage: number;
  automaticPayout: boolean;
  dyoTokensEarned: number;
  dyoTokensPending: number;
  lastPayout?: Date;
}

interface DyoPayment {
  id: string;
  amount: number;
  recipient: string;
  recipientName?: string;
  status: 'queued' | 'processing' | 'confirmed' | 'failed';
  gasUsed: number;
  blockNumber?: number;
  transactionHash?: string;
  timestamp: Date;
  type: 'royalty' | 'split' | 'manual';
}

interface RoyaltyPayment {
  id: string;
  date: Date;
  amount: number;
  amountDYO: number;
  amountDYS: number;
  amountUSD: number;
  status: 'pending' | 'completed' | 'failed';
  source: 'streaming' | 'purchase' | 'sync' | 'mechanical';
  description: string;
  transactionHash?: string;
  blockNumber?: number;
  songs: Array<{
    title: string;
    streams: number;
    earnings: number;
    earningsDYO: number;
  }>;
}

interface TokenPrice {
  dyo: number;
  dys: number;
  dyoChange24h: number;
  dysChange24h: number;
}

interface PaymentQueue {
  pending: DyoPayment[];
  processing: DyoPayment[];
  completed: DyoPayment[];
  failed: DyoPayment[];
}

const RoyaltiesManager: React.FC = () => {
  const { user } = useAuth();
  const { account } = useBlockchain();
  const { available_dyo, dys, refreshBalance } = useUnifiedBalance();
  const [payments, setPayments] = useState<RoyaltyPayment[]>([]);
  const [streamEarnings, setStreamEarnings] = useState<StreamEarning[]>([]);
  const [splits, setSplits] = useState<RoyaltySplit[]>([]);
  const [paymentQueue, setPaymentQueue] = useState<PaymentQueue>({
    pending: [],
    processing: [],
    completed: [],
    failed: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tokenPrice, setTokenPrice] = useState<TokenPrice>({ dyo: 1.0, dys: 1.0, dyoChange24h: 0, dysChange24h: 0 });
  const [totalEarnedDYO, setTotalEarnedDYO] = useState(0);
  const [pendingEarnedDYO, setPendingEarnedDYO] = useState(0);
  const [realTimeCounter, setRealTimeCounter] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(true);
  const [payoutThreshold, setPayoutThreshold] = useState(10); // Minimum DYO to trigger auto payout
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realTimeUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Get wallet address
  const getWalletAddress = useCallback((): string | undefined => {
    let walletAddress: string | undefined = account || user?.uid;
    
    if (!walletAddress || !walletAddress.startsWith('DU')) {
      walletAddress = localStorage.getItem('dujyo_wallet_account') || undefined;
    }
    
    if (!walletAddress || !walletAddress.startsWith('DU')) {
      const storedWallet = localStorage.getItem('dujyo_wallet');
      if (storedWallet) {
        try {
          const wallet = JSON.parse(storedWallet);
          if (wallet.address && wallet.address.startsWith('DU')) {
            walletAddress = wallet.address;
          }
        } catch (e) {
          console.warn('Error parsing dujyo_wallet:', e);
        }
      }
    }
    
    return walletAddress;
  }, [account, user?.uid]);

  // Fetch token prices from DEX
  const fetchTokenPrices = useCallback(async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/dex/token-price`);
      if (response.ok) {
        const data = await response.json();
        setTokenPrice({
          dyo: data.dyo || 1.0,
          dys: data.dys || 1.0,
          dyoChange24h: data.dyoChange24h || 0,
          dysChange24h: data.dysChange24h || 0
        });
      }
    } catch (error) {
      console.error('Error fetching token prices:', error);
    }
  }, []);

  // Fetch real-time stream earnings
  const fetchStreamEarnings = useCallback(async () => {
    const walletAddress = getWalletAddress();
    if (!walletAddress) return;

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/royalties/stream-earnings?wallet=${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const earnings: StreamEarning[] = (data.earnings || []).map((e: any) => ({
          id: e.id || Date.now().toString(),
          timestamp: new Date(e.timestamp || Date.now()),
          streams: e.streams || 0,
          dyoTokens: e.dyoTokens || 0,
          platform: e.platform || 'Unknown',
          songId: e.songId || '',
          songTitle: e.songTitle || 'Unknown',
          status: e.status || 'pending',
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber
        }));
        
        setStreamEarnings(earnings);
        setPendingEarnedDYO(earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.dyoTokens, 0));
        setTotalEarnedDYO(earnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.dyoTokens, 0));
      }
    } catch (error) {
      console.error('Error fetching stream earnings:', error);
    }
  }, [getWalletAddress]);

  // Fetch royalty splits
  const fetchRoyaltySplits = useCallback(async () => {
    const walletAddress = getWalletAddress();
    if (!walletAddress) return;

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/collaborators/splits?wallet=${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const splitsData: RoyaltySplit[] = (data.splits || []).map((s: any) => ({
          id: s.id || Date.now().toString(),
          songId: s.songId || '',
          songTitle: s.songTitle || 'Unknown',
          collaboratorWallet: s.collaboratorWallet || '',
          collaboratorName: s.collaboratorName || 'Unknown',
          percentage: s.percentage || 0,
          automaticPayout: s.automaticPayout !== false,
          dyoTokensEarned: s.dyoTokensEarned || 0,
          dyoTokensPending: s.dyoTokensPending || 0,
          lastPayout: s.lastPayout ? new Date(s.lastPayout) : undefined
        }));
        
        setSplits(splitsData);
      }
    } catch (error) {
      console.error('Error fetching royalty splits:', error);
    }
  }, [getWalletAddress]);

  // Fetch payment queue
  const fetchPaymentQueue = useCallback(async () => {
    const walletAddress = getWalletAddress();
    if (!walletAddress) return;

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/blockchain/payout/queue?wallet=${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const queue: PaymentQueue = {
          pending: (data.pending || []).map(mapPayment),
          processing: (data.processing || []).map(mapPayment),
          completed: (data.completed || []).map(mapPayment),
          failed: (data.failed || []).map(mapPayment)
        };
        setPaymentQueue(queue);
      }
    } catch (error) {
      console.error('Error fetching payment queue:', error);
    }
  }, [getWalletAddress]);

  const mapPayment = (p: any): DyoPayment => ({
    id: p.id || Date.now().toString(),
    amount: p.amount || 0,
    recipient: p.recipient || '',
    recipientName: p.recipientName,
    status: p.status || 'queued',
    gasUsed: p.gasUsed || 0,
    blockNumber: p.blockNumber,
    transactionHash: p.transactionHash,
    timestamp: new Date(p.timestamp || Date.now()),
    type: p.type || 'royalty'
  });

  // Fetch all royalty data
  const fetchRoyaltyData = useCallback(async () => {
    setLoading(true);
    const walletAddress = getWalletAddress();
    
    if (!walletAddress || !walletAddress.startsWith('DU')) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/royalties/artist/${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch royalties: ${response.status}`);
      }

      const backendData = await response.json();
      const dyoPrice = tokenPrice.dyo || 1.0;
      const dysPrice = tokenPrice.dys || 1.0;

      const paymentsData: RoyaltyPayment[] = (backendData.payment_history || []).map((payment: any) => {
        const amountDYO = payment.amountDYO || (payment.amount / dyoPrice);
        const amountDYS = payment.amountDYS || (payment.amount / dysPrice);
        const amountUSD = payment.amount || (amountDYO * dyoPrice);
        
        return {
          id: payment.payment_id || '',
          date: new Date(payment.date || Date.now()),
          amount: amountUSD,
          amountDYO,
          amountDYS,
          amountUSD,
          status: payment.status === 'completed' ? 'completed' : payment.status === 'pending' ? 'pending' : 'failed',
          source: payment.source === 'streaming' ? 'streaming' : payment.source === 'purchase' ? 'purchase' : payment.source === 'sync' ? 'sync' : 'mechanical',
          description: `${payment.source} - ${payment.date || ''}`,
          transactionHash: payment.transaction_hash || undefined,
          blockNumber: payment.block_number,
          songs: payment.songs || []
        };
      });

      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching royalty data:', error);
    } finally {
      setLoading(false);
    }
  }, [getWalletAddress, tokenPrice]);

  // Process automatic payout
  const processAutomaticPayout = useCallback(async () => {
    if (!autoPayoutEnabled || available_dyo < payoutThreshold) return;

    const walletAddress = getWalletAddress();
    if (!walletAddress) return;

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/payments/payout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Usar el umbral configurado para el payout automático
          amount: Math.min(available_dyo, payoutThreshold)
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const paid = Math.min(available_dyo, payoutThreshold);
          try { alert(`Payout processed: ${paid.toFixed(2)} $DYO\nTX: ${data.tx_hash || 'n/a'}`); } catch {}
          showNotification(`Payout processed: ${paid.toFixed(2)} $DYO`);
          // Refresh all data
          fetchStreamEarnings();
          fetchPaymentQueue();
          refreshBalance();
          fetchRoyaltyData();
        } else {
          try { alert(data.message || 'Payout failed'); } catch {}
        }
      } else {
        const txt = await response.text().catch(() => '');
        console.error('Payout response error:', response.status, txt);
        try { alert(`Payout failed (${response.status}) ${txt || ''}`); } catch {}
      }
    } catch (error) {
      console.error('Error processing automatic payout:', error);
      try { alert('Payout failed. Check console for details.'); } catch {}
    }
  }, [autoPayoutEnabled, available_dyo, payoutThreshold, getWalletAddress, fetchStreamEarnings, fetchPaymentQueue, refreshBalance, fetchRoyaltyData]);

  // Manual payout action (prompt amount)
  const handlePayout = useCallback(async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;
      const apiBaseUrl = getApiBaseUrl();
      const minPayout = 10.0;
      if (available_dyo < minPayout) {
        showNotification(`Minimum payout is ${minPayout} $DYO`);
        return;
      }
      const input = window.prompt(`Enter payout amount (min ${minPayout}, max ${available_dyo.toFixed(2)})`, Math.min(available_dyo, minPayout).toFixed(2));
      if (!input) return;
      const amount = Math.max(0, parseFloat(input));
      if (isNaN(amount) || amount < minPayout) {
        showNotification(`Amount must be at least ${minPayout} $DYO`);
        return;
      }
      if (amount > available_dyo) {
        showNotification(`Amount exceeds available balance (${available_dyo.toFixed(2)} $DYO)`);
        return;
      }
      const resp = await fetch(`${apiBaseUrl}/api/v1/payments/payout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        showNotification(`Payout processed: ${amount.toFixed(2)} $DYO`);
        refreshBalance();
        fetchRoyaltyData();
      } else {
        showNotification(data.message || 'Payout failed');
      }
    } catch (e) {
      console.error('Error processing payout:', e);
      showNotification('Payout failed');
    }
  }, [available_dyo, refreshBalance, fetchRoyaltyData]);

  // Disable WebSocket for MVP (avoid console noise); rely on polling
  useEffect(() => {
    setWsConnected(false);
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
    };
  }, []);

  // Setup polling for updates
  useEffect(() => {
    fetchTokenPrices();
    fetchStreamEarnings();
    fetchRoyaltySplits();
    fetchPaymentQueue();
    fetchRoyaltyData();
    fetchStripeStatus();

    // Update every 30 seconds
    updateIntervalRef.current = setInterval(() => {
      fetchTokenPrices();
      fetchStreamEarnings();
      fetchRoyaltySplits();
      fetchPaymentQueue();
      fetchRoyaltyData();
      fetchStripeStatus();
    }, 30000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [fetchTokenPrices, fetchStreamEarnings, fetchRoyaltySplits, fetchPaymentQueue, fetchRoyaltyData]);

  const fetchStripeStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/api/v1/stripe/connect/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setStripeConnected(!!data.connected);
      setStripeAccountId(data.stripe_account_id || null);
    } catch {}
  }, []);

  const connectStripe = useCallback(async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/api/v1/stripe/connect/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        try { alert(data.message || 'Stripe connect failed'); } catch {}
        return;
      }
      setStripeConnected(true);
      setStripeAccountId(data.stripe_account_id);
      // Abrir onboarding (test)
      window.open(data.onboarding_url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Stripe connect error:', e);
      try { alert('Stripe connect failed'); } catch {}
    }
  }, []);

  const withdrawToStripe = useCallback(async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;
      if (!stripeConnected) {
        try { alert('Connect Stripe first (Test)'); } catch {}
        return;
      }
      const minPayout = 10.0;
      if (available_dyo < minPayout) {
        showNotification(`Minimum payout is ${minPayout} $DYO`);
        return;
      }
      const input = window.prompt(`Withdraw to Stripe (Test) - amount in $DYO (min ${minPayout}, max ${available_dyo.toFixed(2)})`, Math.min(available_dyo, minPayout).toFixed(2));
      if (!input) return;
      const amount = parseFloat(input);
      if (isNaN(amount) || amount < minPayout) {
        showNotification(`Amount must be at least ${minPayout} $DYO`);
        return;
      }
      if (amount > available_dyo) {
        showNotification(`Amount exceeds available balance (${available_dyo.toFixed(2)} $DYO)`);
        return;
      }
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/api/v1/stripe/payouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount_dyo: amount })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        try { alert(`Stripe test payout processed: ${amount.toFixed(2)} $DYO\nTX: ${data.stripe_tx_id || 'n/a'}`); } catch {}
        showNotification(`Stripe test payout processed: ${amount.toFixed(2)} $DYO`);
        refreshBalance();
        fetchRoyaltyData();
      } else {
        showNotification(data.message || 'Stripe payout failed');
      }
    } catch (e) {
      console.error('Stripe payout error:', e);
      showNotification('Stripe payout failed');
    }
  }, [stripeConnected, available_dyo, refreshBalance, fetchRoyaltyData]);

  // Real-time counter animation
  useEffect(() => {
    if (realTimeCounter > 0) {
      realTimeUpdateRef.current = setTimeout(() => {
        setRealTimeCounter(0);
      }, 5000);
    }
    return () => {
      if (realTimeUpdateRef.current) {
        clearTimeout(realTimeUpdateRef.current);
      }
    };
  }, [realTimeCounter]);

  // Auto payout check
  useEffect(() => {
    if (autoPayoutEnabled && pendingEarnedDYO >= payoutThreshold) {
      processAutomaticPayout();
    }
  }, [autoPayoutEnabled, pendingEarnedDYO, payoutThreshold, processAutomaticPayout]);

  const showNotification = (message: string) => {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
    notification.innerHTML = `
      <Coins class="w-4 h-4" />
      <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDYO = (amount: number) => {
    return `${amount.toFixed(3)} $DYO`;
  };

  const formatDYS = (amount: number) => {
    return `${amount.toFixed(2)} $DYS`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': case 'confirmed': case 'paid': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending': case 'queued': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing': return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'streaming': return <Music className="w-4 h-4" />;
      case 'purchase': return <DollarSign className="w-4 h-4" />;
      case 'sync': return <FileText className="w-4 h-4" />;
      case 'mechanical': return <PieChart className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesPeriod = selectedPeriod === 'all' || true;
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.songs.some(song => song.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesPeriod && matchesStatus && matchesSearch;
  });

  const pendingEarningsUSD = pendingEarnedDYO * tokenPrice.dyo;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Real-Time Earnings Counter */}
      {realTimeCounter > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-amber-400 animate-pulse" />
            <div>
              <p className="text-sm text-gray-300">New Earnings</p>
              <p className="text-2xl font-bold text-amber-400">+{formatDYO(realTimeCounter)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">≈ {formatCurrency(realTimeCounter * tokenPrice.dyo)}</p>
            <p className="text-xs text-gray-500">Updated just now</p>
          </div>
        </motion.div>
      )}

      {/* Stripe Connect (Test) Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={connectStripe}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${stripeConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
          title={stripeConnected ? `Connected: ${stripeAccountId || ''}` : 'Connect Stripe (Test)'}
        >
          <LinkIcon className="w-4 h-4" />
          {stripeConnected ? 'Stripe Connected (Test)' : 'Connect Stripe (Test)'}
        </button>
        <button
          onClick={withdrawToStripe}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Banknote className="w-4 h-4" />
          Withdraw to Stripe (Test)
        </button>
      </div>

      {/* Summary Cards with Multi-Currency */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Total Earned (DYO)</p>
              <p className="text-3xl font-bold text-white">{formatDYO(totalEarnedDYO)}</p>
              <p className="text-amber-200 text-sm mt-1">≈ {formatCurrency(totalEarnedDYO * tokenPrice.dyo)}</p>
            </div>
            <Coins className="w-12 h-12 text-amber-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pending (DYO)</p>
              <p className="text-3xl font-bold text-white">{formatDYO(pendingEarnedDYO)}</p>
              <p className="text-yellow-200 text-sm mt-1">≈ {formatCurrency(pendingEarningsUSD)}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Wallet Balance</p>
              <p className="text-2xl font-bold text-white">{formatDYO(available_dyo)}</p>
              <p className="text-green-200 text-sm mt-1">{formatDYS(dys)}</p>
            </div>
            <Wallet className="w-12 h-12 text-green-200" />
          </div>
          <button
            onClick={handlePayout}
            disabled={available_dyo < 10}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
            title={available_dyo < 10 ? 'Minimum payout is 10 $DYO' : 'Request payout'}
          >
            Request Payout
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Token Price</p>
              <p className="text-2xl font-bold text-white">${tokenPrice.dyo.toFixed(3)}</p>
              <div className="flex items-center gap-1 mt-1">
                {tokenPrice.dyoChange24h >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-400" />
                )}
                <p className={`text-sm ${tokenPrice.dyoChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Math.abs(tokenPrice.dyoChange24h).toFixed(2)}%
                </p>
              </div>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-200" />
          </div>
        </motion.div>
      </div>

      {/* Auto Payout Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="text-xl font-bold text-white">Automatic Payout Settings</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPayoutEnabled}
              onChange={(e) => setAutoPayoutEnabled(e.target.checked)}
              className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500"
            />
            <span className="text-white">Enable Auto Payout</span>
          </label>
        </div>
        {autoPayoutEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Payout Threshold (DYO)</label>
              <input
                type="number"
                value={payoutThreshold}
                onChange={(e) => setPayoutThreshold(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
                min="0"
                step="0.1"
              />
            </div>
            <div className="flex items-end">
              <div className="w-full">
                <p className="text-sm text-gray-400 mb-2">Current Available</p>
                <p className="text-xl font-bold text-amber-400">{formatDYO(available_dyo)}</p>
                {available_dyo >= payoutThreshold && (
                  <p className="text-xs text-green-400 mt-1">Ready for payout</p>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={processAutomaticPayout}
                disabled={available_dyo < payoutThreshold}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Process Payout Now
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Payment Queue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Payment Queue</h3>
          <p className="text-gray-400 text-sm mt-1">Track your $DYO payment status on DYO Chain</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-sm font-medium">Queued</p>
              <p className="text-2xl font-bold text-white">{paymentQueue.pending.length}</p>
            </div>
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm font-medium">Processing</p>
              <p className="text-2xl font-bold text-white">{paymentQueue.processing.length}</p>
            </div>
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 text-sm font-medium">Completed</p>
              <p className="text-2xl font-bold text-white">{paymentQueue.completed.length}</p>
            </div>
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm font-medium">Failed</p>
              <p className="text-2xl font-bold text-white">{paymentQueue.failed.length}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {[...paymentQueue.pending, ...paymentQueue.processing, ...paymentQueue.completed.slice(0, 5), ...paymentQueue.failed.slice(0, 3)].map((payment) => (
              <div key={payment.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(payment.status)}
                  <div>
                    <p className="text-white font-medium">{formatDYO(payment.amount)}</p>
                    <p className="text-sm text-gray-400">
                      {payment.recipientName || payment.recipient.substring(0, 10)}...
                      {payment.type === 'split' && ' (Split)'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {payment.transactionHash && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(payment.transactionHash!)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {copiedHash === payment.transactionHash ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={`https://explorer.dujyo.com/tx/${payment.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                  <span className="text-sm text-gray-400">{formatDate(payment.timestamp)}</span>
                </div>
              </div>
            ))}
            {paymentQueue.pending.length === 0 && paymentQueue.processing.length === 0 && paymentQueue.completed.length === 0 && paymentQueue.failed.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No payments in queue</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Real-Time Stream Earnings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Real-Time Stream Earnings</h3>
          <p className="text-gray-400 text-sm mt-1">Live $DYO earnings from your content</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Song</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Streams</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">DYO Earned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">TX Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {streamEarnings.slice(0, 20).map((earning) => (
                <tr key={earning.id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(earning.timestamp)}
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-medium">
                    {earning.songTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {earning.platform}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {earning.streams.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-amber-400">
                    {formatDYO(earning.dyoTokens)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusIcon(earning.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {earning.transactionHash ? (
                      <a
                        href={`https://explorer.dujyo.com/tx/${earning.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                      >
                        {earning.transactionHash.substring(0, 10)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-500">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {streamEarnings.length === 0 && (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No stream earnings yet</p>
              <p className="text-gray-500 text-sm mt-2">Start streaming content to earn $DYO tokens!</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Automatic Royalty Splits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl shadow-lg p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4">Automatic Royalty Splits</h3>
        <div className="space-y-4">
          {splits.length > 0 ? splits.map((split) => (
            <div key={split.id} className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-white">{split.songTitle}</h4>
                <div className="flex items-center gap-2">
                  {split.automaticPayout && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Auto Payout</span>
                  )}
                  <span className="text-amber-400 font-semibold">{formatDYO(split.dyoTokensEarned + split.dyoTokensPending)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {split.percentage}%
                    </div>
                    <div>
                      <p className="text-white font-medium">{split.collaboratorName}</p>
                      <p className="text-gray-400 text-sm font-mono">{split.collaboratorWallet.substring(0, 20)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-semibold">{formatDYO(split.dyoTokensEarned)}</p>
                    {split.dyoTokensPending > 0 && (
                      <p className="text-yellow-400 text-sm">+{formatDYO(split.dyoTokensPending)} pending</p>
                    )}
                  </div>
                </div>
              </div>
              {split.lastPayout && (
                <p className="text-xs text-gray-400 mt-2">Last payout: {formatDate(split.lastPayout)}</p>
              )}
            </div>
          )) : (
            <div className="text-center py-12">
              <PieChart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No royalty splits configured</p>
              <p className="text-gray-500 text-sm mt-2">Configure splits in your upload settings</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
            <option value="all">All time</option>
          </select>
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-amber-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Payment History with Multi-Currency */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Payment History</h3>
          <p className="text-gray-400 text-sm mt-1">Complete transaction history with blockchain confirmations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount (DYO)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount (USD)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Blockchain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(payment.date)}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">{payment.description}</p>
                      <div className="mt-1 space-y-1">
                        {payment.songs.map((song, index) => (
                          <p key={index} className="text-xs text-gray-400">
                            {song.title} - {song.streams > 0 ? `${song.streams.toLocaleString()} streams` : 'Purchase'}
                          </p>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getSourceIcon(payment.source)}
                      <span className="text-sm text-gray-300 capitalize">{payment.source}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-amber-400">
                    {formatDYO(payment.amountDYO)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-400">
                    {formatCurrency(payment.amountUSD)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(payment.status)}
                      <span className="text-sm text-gray-300 capitalize">{payment.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {payment.transactionHash ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(payment.transactionHash!)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {copiedHash === payment.transactionHash ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <a
                          href={`https://explorer.dujyo.com/tx/${payment.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {payment.blockNumber && (
                          <span className="text-xs text-gray-500">#{payment.blockNumber}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No payment history yet</p>
              <p className="text-gray-500 text-sm mt-2">Start uploading and streaming content to earn royalties!</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RoyaltiesManager;
