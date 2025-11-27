import React, { useEffect, useState } from 'react';
import { 
  checkSystemHealth, 
  getBlockchain, 
  getAccountBalance 
} from '../../services/api';

const BlockchainInfo: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const testAddress = '5DkUgD5gkUdKbsLNLZJpV5MknTTsPmWkzA6UQ3p2FXUk9Ckd'; // Dirección de prueba

  // Función para obtener el estado del sistema
  const fetchSystemHealth = async () => {
    try {
      const health = await checkSystemHealth();
      setSystemHealth(health);
    } catch (err) {
      console.error('Error al obtener el estado del sistema:', err);
      setError('No se pudo conectar con la blockchain.');
    }
  };

  // Función para obtener el nombre de la cadena
  const fetchChainName = async () => {
    try {
      const chain = await getBlockchain();
      setChainName(chain.name || 'Dujyo Blockchain');
    } catch (err) {
      console.error('Error al obtener el nombre de la cadena:', err);
      setError('No se pudo obtener la información de la cadena.');
    }
  };

  // Función para obtener el balance de una cuenta
  const fetchAccountBalance = async (address: string) => {
    try {
      const balance = await getAccountBalance(address);
      setAccountBalance(balance.balance || 0);
    } catch (err) {
      console.error('Error al obtener el balance:', err);
      setError('No se pudo obtener el balance de la cuenta.');
    }
  };

  useEffect(() => {
    fetchSystemHealth();
    fetchChainName();
    fetchAccountBalance(testAddress);
  }, []);

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Información de la Blockchain</h2>
      {systemHealth ? (
        <div>
          <p><strong>¿Está sincronizando?:</strong> {systemHealth.isSyncing ? 'Sí' : 'No'}</p>
          <p><strong>Número de pares:</strong> {systemHealth.peers}</p>
          <p><strong>¿Debería tener pares?:</strong> {systemHealth.shouldHavePeers ? 'Sí' : 'No'}</p>
        </div>
      ) : (
        <p>Cargando estado del sistema...</p>
      )}
      {chainName && (
        <p><strong>Nombre de la Cadena:</strong> {chainName}</p>
      )}
      {accountBalance !== null ? (
        <p><strong>Balance de la Cuenta:</strong> {accountBalance} tokens</p>
      ) : (
        <p>Cargando balance de la cuenta...</p>
      )}
      <p>
        <small>Dirección de prueba: {testAddress}</small>
      </p>
    </div>
  );
};

export default BlockchainInfo;
