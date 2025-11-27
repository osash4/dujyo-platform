import axios from 'axios';

// Crear una instancia de axios con timeout y baseURL
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083', // Use environment variable
  timeout: 30000, // Timeout de 30 segundos para cada solicitud
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Verifica la conexión inicial con la blockchain.
 * @returns {Promise<boolean>} True si la conexión es exitosa, False en caso contrario.
 */
export const initializeBlockchainConnection = async (): Promise<boolean> => {
  try {
    console.log('Verificando la conexión con la blockchain...');
    const response = await instance.get('/health');

    if (response.data) {
      console.log('Conexión con la blockchain establecida correctamente.');
      return true;
    } else {
      console.error('Error al conectar con la blockchain:', 'Respuesta inválida');
      return false;
    }
  } catch (error) {
    console.error('Error al verificar la conexión:', error instanceof Error ? error.message : error);
    return false;
  }
};

/**
 * Realiza una solicitud HTTP genérica al servidor backend.
 * @param {string} endpoint - Endpoint HTTP.
 * @param {any} data - Datos de la solicitud.
 * @param {string} method - Método HTTP (GET, POST, etc.).
 * @returns {Promise<any>} Resultado de la solicitud.
 */
const makeHttpRequest = async (endpoint: string, data: any = null, method: string = 'GET') => {
  try {
    console.log(`Haciendo solicitud HTTP: ${method} ${endpoint}`);
    let response;
    
    if (method === 'GET') {
      response = await instance.get(endpoint);
    } else if (method === 'POST') {
      response = await instance.post(endpoint, data);
    } else {
      throw new Error(`Método HTTP no soportado: ${method}`);
    }

    if (response.data) {
      return response.data;
    } else {
      throw new Error('Respuesta inválida del servidor');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error en Axios para endpoint "${endpoint}":`, error.message);
      console.error('Detalles del error:', error.response?.data);
    } else {
      console.error(`Error desconocido en endpoint "${endpoint}":`, error);
    }
    throw error;
  }
};

/**
 * Verifica la salud del sistema.
 * @returns {Promise<any>} Estado del sistema.
 */
export const checkSystemHealth = async (): Promise<any> => {
  try {
    return await makeHttpRequest('/health');
  } catch (error) {
    console.error('Error al obtener la salud del sistema:', error);
    throw new Error('Error al obtener la salud del sistema');
  }
};

/**
 * Obtiene la cadena de bloques.
 * @returns {Promise<any>} Nombre de la cadena de bloques.
 */
export const getBlockchain = async (): Promise<any> => {
  return makeHttpRequest('/blocks');
};

/**
 * Obtiene el balance de una cuenta específica.
 * @param {string} address - Dirección de la cuenta.
 * @returns {Promise<any>} Balance de la cuenta.
 */
export const getAccountBalance = async (address: string): Promise<any> => {
  return makeHttpRequest(`/balance/${address}`);
};

/**
 * Envía una transacción desde un remitente a un destinatario.
 * @param {string} sender - Dirección del remitente.
 * @param {string} receiver - Dirección del destinatario.
 * @param {number} amount - Cantidad a transferir.
 * @returns {Promise<any>} Resultado de la transacción.
 */
export const addTransaction = async (sender: string, receiver: string, amount: number): Promise<any> => {
  const transactionData = {
    from: sender,
    to: receiver,
    amount: amount
  };
  return makeHttpRequest('/transaction', transactionData, 'POST');
};

/**
 * Agrega un validador a la red.
 * @param {string} validatorAddress - Dirección del validador.
 * @param {string} stake - Cantidad de stake asignada.
 * @returns {Promise<any>} Resultado de la operación.
 */
export const addValidator = async (validatorAddress: string, stake: string): Promise<any> => {
  const validatorData = {
    address: validatorAddress,
    stake: stake
  };
  return makeHttpRequest('/validator', validatorData, 'POST');
};

/**
 * Obtiene todas las transacciones de la blockchain.
 * @returns {Promise<any>} Lista de transacciones.
 */
export const getTransactions = async (): Promise<any> => {
  try {
    console.log('Obteniendo transacciones de la blockchain...');
    return await makeHttpRequest('/transactions');
  } catch (error) {
    console.error('Error al obtener las transacciones:', error);
    throw new Error('Error al obtener las transacciones');
  }
};

/**
 * Obtiene la altura actual del bloque.
 * @returns {Promise<number>} Altura del bloque.
 */
export const getBlockHeight = async (): Promise<number> => {
  try {
    console.log('Obteniendo la altura del bloque...');
    const response = await makeHttpRequest('/blocks');
    return response.chain ? response.chain.length : 0;
  } catch (error) {
    console.error('Error al obtener la altura del bloque:', error);
    throw new Error('Error desconocido al obtener la altura del bloque');
  }
};
