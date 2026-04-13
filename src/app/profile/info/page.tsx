"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { YMaps, Map, GeolocationControl, ZoomControl } from '@pbe/react-yandex-maps';

const GlassInput = ({ label, name, value, onChange, type = "text", placeholder, required = false, rightIcon, onRightIconClick }: any) => (
  <div className="flex flex-col gap-[8px] w-[342px] shrink-0">
    <label className="ml-[16px] text-[10px] tracking-[0.02em] text-[#616161] uppercase font-['Arial'] font-bold">
      {label} {required && <span className="text-[#FF00EE]">*</span>}
    </label>
    
    <div 
      className="relative w-full h-[52px] rounded-[25px] bg-[#FFFFFF]/20 backdrop-blur-[30px] shrink-0 box-border transition-all focus-within:shadow-[0_0_15px_rgba(255,0,238,0.3)] flex items-center"
      style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 4px 6px 2px rgba(8, 0, 255, 0.15)' }}
    >
      <input
        type={type}
        name={name}
        value={value} 
        onChange={onChange} 
        placeholder={placeholder}
        className={`w-full h-full bg-transparent px-[16px] ${rightIcon ? 'pr-[48px]' : ''} text-[12px] text-[#413F40] outline-none placeholder:text-[#616161]/40 rounded-[25px] font-['Arial'] font-bold`}
      />
      {rightIcon && (
        <button 
          onClick={onRightIconClick}
          className="absolute right-[16px] w-[24px] h-[24px] flex items-center justify-center active:scale-90 transition-transform"
        >
          {rightIcon}
        </button>
      )}
    </div>
  </div>
);

export default function InfoPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: ''
  });
  
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [ymapsInstance, setYmapsInstance] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState([47.2197, 38.9325]); 
  const [currentAddress, setCurrentAddress] = useState("Двигай карту, чтобы выбрать адрес");
  const [geocodeTimeout, setGeocodeTimeout] = useState<any>(null);

  // ❗ ПРИ ЗАГРУЗКЕ ЧИТАЕМ ВСЕ ДАННЫЕ ИЗ ПАМЯТИ ❗
  useEffect(() => {
    const savedFirstName = localStorage.getItem('bubble_user_name');
    const savedLastName = localStorage.getItem('bubble_user_lastname');
    const savedPhone = localStorage.getItem('bubble_user_phone');
    const savedEmail = localStorage.getItem('bubble_user_email');
    const savedAddress = localStorage.getItem('bubble_user_address');
    
    setFormData({
      firstName: savedFirstName || '',
      lastName: savedLastName || '',
      phone: savedPhone || '',
      email: savedEmail || '',
      address: savedAddress || ''
    });
  }, []);

  useEffect(() => {
    if (isMapOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = [position.coords.latitude, position.coords.longitude];
          setMapCenter(newCoords);
          if (ymapsInstance) fetchAddress(newCoords, ymapsInstance);
        },
        (error) => console.log("Геолокация отклонена", error)
      );
    }
  }, [isMapOpen, ymapsInstance]);

  const fetchAddress = (coords: number[], ymaps: any) => {
    setCurrentAddress("Ищем адрес...");
    ymaps.geocode(coords).then((res: any) => {
      const firstGeoObject = res.geoObjects.get(0);
      if (firstGeoObject) {
        setCurrentAddress(firstGeoObject.getAddressLine());
      } else {
        setCurrentAddress("Адрес не найден");
      }
    }).catch(() => {
      setCurrentAddress("Ошибка загрузки адреса. Проверьте API ключ.");
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ❗ ТЕПЕРЬ СОХРАНЯЕМ В ПАМЯТЬ АБСОЛЮТНО ВСЕ ПОЛЯ ❗
  const handleSave = () => {
    localStorage.setItem('bubble_user_name', formData.firstName);
    localStorage.setItem('bubble_user_lastname', formData.lastName);
    localStorage.setItem('bubble_user_phone', formData.phone);
    localStorage.setItem('bubble_user_email', formData.email);
    localStorage.setItem('bubble_user_address', formData.address);
    alert("✅ Данные успешно сохранены!");
  };

  const handleConfirmMap = () => {
    setFormData({ ...formData, address: currentAddress });
    setIsMapOpen(false);
  };

  const MapIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF008C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-[#F2F2F7] flex justify-center font-sans overflow-hidden">
      
      {isMapOpen && (
        <style dangerouslySetInnerHTML={{ __html: `
          nav, footer, .bottom-nav, .fixed.bottom-0 { display: none !important; }
        `}} />
      )}

      <main className="w-full max-w-[402px] h-full relative bg-[#FFFFFF] overflow-y-auto no-scrollbar flex flex-col items-center pt-[40px] pb-[150px]">
        <section className="w-full flex flex-col items-center gap-[24px]">
          
          <GlassInput label="Имя" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Твое имя" required />
          <GlassInput label="Фамилия" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Твоя фамилия" />
          <GlassInput label="Телефон" name="phone" value={formData.phone} onChange={handleChange} type="tel" placeholder="+7 (999) 000-00-00" required />
          <GlassInput label="Email" name="email" value={formData.email} onChange={handleChange} type="email" placeholder="example@mail.ru" />
          
          <GlassInput 
            label="Адрес доставки" 
            name="address" 
            value={formData.address} 
            onChange={handleChange} 
            placeholder="Нажми на иконку карты ->" 
            required 
            rightIcon={MapIcon}
            onRightIconClick={() => setIsMapOpen(true)}
          />

          <button 
            onClick={handleSave}
            className="mt-[16px] w-[342px] h-[60px] rounded-[25px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 15px rgba(255, 0, 140, 0.4)' }}
          >
            <span className="text-[18px] text-[#FFFFFF] uppercase tracking-[0.02em] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] font-['Arial'] font-bold">
              Сохранить
            </span>
          </button>

        </section>
      </main>

      {isMapOpen && (
        <div className="fixed top-0 left-0 w-full h-[100dvh] z-[99999] bg-[#E5E5EA] flex flex-col mx-auto animate-in fade-in duration-200">
          <div className="flex-1 relative bg-[#D6D6D8] overflow-hidden">
            <YMaps query={{ apikey: '9acfbbff-9cc7-4ed2-a594-019b271209eb', load: 'package.full' }}>
              <Map
                state={{ center: mapCenter, zoom: 16 }}
                width="100%"
                height="100%"
                onLoad={(ymaps) => {
                  setYmapsInstance(ymaps);
                  fetchAddress(mapCenter, ymaps);
                }}
                onBoundsChange={(e: any) => {
                  const newCoords = e.get('newCenter');
                  setMapCenter(newCoords);
                  if (geocodeTimeout) clearTimeout(geocodeTimeout);
                  const newTimeout = setTimeout(() => {
                    fetchAddress(newCoords, ymapsInstance);
                  }, 500);
                  setGeocodeTimeout(newTimeout);
                }}
                options={{ suppressMapOpenBlock: true }}
              >
                <GeolocationControl options={{ float: 'right' }} />
                <ZoomControl options={{ float: 'right' }} />
              </Map>
            </YMaps>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none drop-shadow-lg">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#FF008C" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3" fill="white"></circle>
              </svg>
            </div>
          </div>

          <div className="h-[190px] w-full max-w-[402px] mx-auto bg-white rounded-t-[30px] -mt-[20px] relative z-20 flex flex-col items-center pt-[16px] px-[16px] shadow-[0_-5px_20px_rgba(0,0,0,0.1)] shrink-0 pb-[20px]">
            <div className="w-[40px] h-[5px] bg-[#D6D6D8] rounded-full mb-[16px]" />
            <h3 className="text-[14px] font-['Arial'] font-bold text-[#333] text-center mb-[4px] leading-tight min-h-[36px] flex items-center justify-center w-full">
              {currentAddress}
            </h3>
            <p className="text-[10px] text-[#949494] text-center uppercase font-['Arial'] font-bold mb-[20px]">
              Передвиньте карту, чтобы уточнить адрес
            </p>
            <div className="flex gap-[12px] w-full max-w-[342px] mt-auto">
              <button 
                onClick={() => setIsMapOpen(false)}
                className="h-[52px] flex-1 rounded-[20px] bg-[#F2F2F7] text-[#949494] font-['Arial'] font-bold uppercase text-[12px] active:scale-95 transition-transform"
              >
                Отмена
              </button>
              <button 
                onClick={handleConfirmMap}
                className="h-[52px] flex-[1.5] rounded-[20px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white font-['Arial'] font-bold uppercase text-[12px] shadow-[0_4px_10px_rgba(255,0,140,0.3)] active:scale-95 transition-transform"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}