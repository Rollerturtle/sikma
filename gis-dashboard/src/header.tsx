import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  showBackButton?: boolean;
  onBackClick?: () => void;
  title?: string;
  currentPage?: 'tentangkami' | 'kerawanan' | 'kejadian' | 'home';
}

const Header: React.FC<HeaderProps> = ({ 
  showBackButton = false, 
  onBackClick,
  title,
  currentPage = 'home'
}) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-full mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center flex-shrink-0">
            <img 
              src="/images/SIKMA.jpeg" 
              alt="Sistem Informasi Mitigasi dan Adaptasi" 
              className="h-8 object-contain cursor-pointer"
              onClick={() => handleNavigate('/')}
            />
          </div>

          <div className="flex items-center gap-3 flex-grow justify-center">
            <button 
              onClick={() => handleNavigate('/tentang-kami')}
              className={`px-6 py-2.5 text-sm font-medium rounded transition-colors ${
                currentPage === 'tentangkami' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tentang Kami
            </button>
            <button 
              onClick={() => handleNavigate('/kerawanan')}
              className={`px-6 py-2.5 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                currentPage === 'kerawanan' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Info Kerawanan dan Mitigasi
            </button>
            <button 
              onClick={() => handleNavigate('/kebencanaan')}
              className={`px-6 py-2.5 text-sm font-medium rounded transition-colors ${
                currentPage === 'kejadian' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Info Bencana
            </button>
          </div>

          <div className="flex items-center flex-shrink-0">
            <img 
              src="/images/EMAIL.jpeg" 
              alt="Email Contact" 
              className="h-8 object-contain"
            />
          </div>
        </div>

        {showBackButton && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={onBackClick}
                className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center gap-1"
              >
                ← Kembali
              </button>
              {title && (
                <h1 className="text-xl font-bold text-gray-800">
                  {title}
                </h1>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;