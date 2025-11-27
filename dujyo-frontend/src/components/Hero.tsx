import { useState, useEffect } from 'react';
import { useBlockchain } from '../../src/contexts/BlockchainContext';  // Suponiendo que ya tienes este contexto
import { useNavigate } from 'react-router-dom';  // Para redirigir al usuario
import { Wallet as WalletIcon } from 'lucide-react';
import { Link } from 'react-router-dom';  // Corregido para usar react-router-dom

export const Hero = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { setAccount, setIsAuthenticated, isAuthenticated, account } = useBlockchain();
  const navigate = useNavigate();

  // Verificar si la cuenta ya está conectada al cargar el componente
  useEffect(() => {
    if (account) {
      setIsAuthenticated(true);
    }
  }, [account, setIsAuthenticated]);

  const handleConnectWallet = async () => {
    setIsConnecting(true);  // Mostrar estado de conexión
    try {
      // Verificar si la billetera personalizada está disponible en window
      if (window.DujyoAPI) {
        // Obtener la cuenta de la billetera personalizada
        // Usar la dirección que sabemos que funciona en la base de datos
        // Use real wallet from user context, not hardcoded
        const workingAccount = user?.uid || '';
        setAccount(workingAccount);  // Usar la cuenta que funciona

        // Marcar al usuario como autenticado
        setIsAuthenticated(true);

        // Redirigir al perfil del usuario
        navigate('/profile');
        alert('¡Billetera conectada exitosamente!');
      } else {
        alert('Por favor, instala la billetera personalizada de nuestra red.');
      }
    } catch (error) {
      console.error('Error al conectar la billetera', error);
      alert('Hubo un problema al conectar la billetera.');
    } finally {
      setIsConnecting(false);  // Finalizar el estado de conexión
    }
  };

  return (
    <>
      {/* Header */}
      <div className="header flex justify-between items-center px-6 py-4 bg-[#1d475f]">
        <h1 className="text-white text-lg font-bold"></h1>
        <button
          onClick={handleConnectWallet}
          disabled={isConnecting || isAuthenticated}  // Deshabilitar botón si ya está autenticado
          className="flex items-center bg-[#3ecadd] text-white px-4 py-2 rounded-lg hover:bg-[#34b2aa] transition-colors"
        >
          <WalletIcon size={20} className="mr-2" />
          {isConnecting ? 'Conectando...' : isAuthenticated ? 'Wallet Conectada' : 'Connect Wallet'}
        </button>
      </div>

      {/* Main Hero Section */}
      <header className="min-h-screen flex flex-col justify-center items-center text-center text-[#d2e9ed] px-5">
        <div className="mb-12">
          <h1 className="text-5xl font-semibold text-[#2596be] mb-4">Welcome to DUJYO</h1>
          <p className="text-2xl text-[#d2e9ed] mb-6 leading-relaxed">
            Your new world of music, video, and gaming powered by blockchain.
          </p>
          <div className="space-x-4">
            <Link
              to="/explore"
              className="inline-block px-8 py-3 bg-[#2596be] text-white font-bold rounded-md hover:bg-[#3ecadd] transition-colors"
            >
              Explore Now
            </Link>
            <button
              onClick={() => navigate('/signup')}
              className="inline-block px-8 py-3 bg-[#407188] text-white font-bold rounded-md hover:bg-[#3ecadd] transition-colors"
            >
              Join Us
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
