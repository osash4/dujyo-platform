import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Clock, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';

// Definir los tipos para las transacciones y los filtros
interface Transaction {
  hash: string;
  type: string;
  amount: number;
  timestamp: string | number;
  from?: string;
  to?: string;
  created_at?: string;
}

interface Filters {
  type: string;
  amount: string;
}

// Definir las props del componente con los tipos adecuados
interface TransactionHistoryProps {
  transactions: Transaction[];
  filters: Filters;
}

export function TransactionHistory({ transactions, filters }: TransactionHistoryProps) {
  const { t } = useLanguage();
  
  // 🔍 DEBUG: Log array state before processing
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 DEBUG TransactionHistory - transactions:', {
      isArray: Array.isArray(transactions),
      length: transactions?.length ?? 0,
      hasUndefined: transactions?.some(item => item === undefined),
      hasNull: transactions?.some(item => item === null),
      sample: transactions?.slice(0, 3)
    });
  }
  
  // Filtrar las transacciones según los filtros proporcionados con validación robusta
  // PRIMERO: Eliminar null/undefined
  const cleanTransactions = (Array.isArray(transactions) ? transactions : [])
    .filter((tx): tx is Transaction => tx != null && tx !== undefined);
  
  // SEGUNDO: Validar estructura y propiedades
  const filteredTransactions = cleanTransactions.filter((tx): tx is Transaction => {
    // Type guard robusto
    if (!tx || typeof tx !== 'object') return false;
    if (!('type' in tx) || !tx.type || typeof tx.type !== 'string') return false;
    if (!('hash' in tx) || !tx.hash || typeof tx.hash !== 'string') return false;
    
    const matchesType = filters.type === 'all' || tx.type === filters.type;
    const matchesAmount =
      filters.amount === 'all' ||
      (filters.amount === 'high' ? (tx.amount || 0) > 1000 : (tx.amount || 0) <= 1000);
    return matchesType && matchesAmount;
  });

  const getTransactionIcon = (type: string) => {
    return type === 'sent' ? ArrowUpRight : ArrowDownLeft;
  };

  const getTransactionColor = (type: string) => {
    return type === 'sent' ? 'text-red-400' : 'text-green-400';
  };

  const getTransactionBgColor = (type: string) => {
    return type === 'sent' ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Hash size={24} className="text-amber-400" />
          {t('wallet.transactionHistory')}
        </h2>
        <span className="text-sm text-gray-400">
          {filteredTransactions.length} {t('wallet.transactions').toLowerCase()}
        </span>
      </div>
      
      {filteredTransactions.length === 0 ? (
        <motion.div
          className="text-center py-12 text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Hash size={48} className="mx-auto mb-4 opacity-50" />
          <p>{t('wallet.noTransactionsFound')}</p>
          <p className="text-sm mt-2">{t('wallet.transactionHistoryWillAppear')}</p>
        </motion.div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(Array.isArray(filteredTransactions) ? filteredTransactions : [])
            .filter((tx): tx is Transaction => {
              // Validación EXTRA antes del map - cuarta capa de seguridad
              if (!tx || typeof tx !== 'object') return false;
              if (!('type' in tx) || tx.type === undefined || tx.type === null) return false;
              if (typeof tx.type !== 'string') return false;
              return true;
            })
            .map((tx, index) => {
              // Validación adicional defensiva - triple check
              if (!tx || typeof tx !== 'object' || !('type' in tx) || !tx.type) {
                console.warn('🔍 DEBUG TransactionHistory - Invalid tx in map after filter:', tx);
                return null;
              }
              
              const txType = String(tx.type) || 'unknown';
            const Icon = getTransactionIcon(txType);
            const colorClass = getTransactionColor(txType);
            const bgClass = getTransactionBgColor(txType);
            
            return (
              <motion.div
                key={`${tx.hash}_${tx.timestamp || index}_${index}`}
                className={`border rounded-lg p-4 ${bgClass} backdrop-blur-sm`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${bgClass} flex-shrink-0`}>
                      <Icon size={20} className={colorClass} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white capitalize truncate">
                        {txType} {(tx.amount || 0)} DUJYO
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} className="flex-shrink-0" />
                        <span className="truncate">
                          {tx.timestamp && !isNaN(Number(tx.timestamp)) 
                            ? format(new Date(Number(tx.timestamp)), 'MMM dd, yyyy HH:mm')
                            : tx.created_at 
                              ? format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')
                              : 'Unknown date'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-semibold ${colorClass} whitespace-nowrap`}>
                      {txType === 'sent' ? '-' : '+'}{(tx.amount || 0)} DUJYO
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-24">
                      {tx.hash ? `${tx.hash.slice(0, 8)}...` : 'N/A'}
                    </div>
                  </div>
                </div>
                
                {(tx.from || tx.to) && (
                  <div className="mt-3 pt-3 border-t border-gray-600/30">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {tx.from && (
                        <div className="min-w-0">
                          <span className="text-gray-400">From:</span>
                          <div className="text-white font-mono truncate">{tx.from}</div>
                        </div>
                      )}
                      {tx.to && (
                        <div className="min-w-0">
                          <span className="text-gray-400">To:</span>
                          <div className="text-white font-mono truncate">{tx.to}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
          .filter(item => item !== null)}
        </div>
      )}
    </div>
  );
}
