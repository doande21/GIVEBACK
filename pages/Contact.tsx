
import React from 'react';

const Contact: React.FC = () => {
  const contactMethods = [
    {
      name: 'Số điện thoại',
      value: '0333.297.621',
      label: 'GỌI TRỰC TIẾP',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      color: 'bg-emerald-600',
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      link: 'tel:0333297621'
    },
    {
      name: 'Zalo cá nhân',
      value: 'GIVEBACK - Admin',
      label: 'NHẮN TIN ZALO',
      icon: (
        <div className="font-black text-xl italic tracking-tighter">Zalo</div>
      ),
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-500',
      link: 'https://zalo.me/0333297621'
    },
    {
      name: 'Facebook Fanpage',
      value: 'GIVEBACK Community',
      label: 'GHÉ THĂM FB',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: 'bg-indigo-600',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      link: 'https://www.facebook.com/per.sup.509?locale=vi_VN'
    }
  ];

  return (
    <div className="pt-32 pb-20 px-4 max-w-6xl mx-auto min-h-screen">
      <div className="text-center mb-16 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-10 w-40 h-40 bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
        <h1 className="text-5xl font-black text-gray-900 italic uppercase tracking-tighter mb-4 relative">Liên hệ chúng tôi</h1>
        <p className="text-emerald-600 font-black text-xs uppercase tracking-[0.4em] italic"> GIVEBACK luôn sẵn sàng lắng nghe</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {contactMethods.map((method, i) => (
          <a 
            key={i} 
            href={method.link}
            target="_blank"
            rel="noreferrer"
            className="group relative bg-white p-10 rounded-[3.5rem] shadow-xl border border-gray-50 flex flex-col items-center text-center hover:-translate-y-3 transition-all duration-500 overflow-hidden"
          >
            {/* Background Shape */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${method.lightColor} rounded-full transition-transform group-hover:scale-150 duration-700`}></div>
            
            <div className={`w-20 h-20 ${method.lightColor} ${method.textColor} rounded-[2rem] flex items-center justify-center mb-8 relative shadow-inner group-hover:rotate-12 transition-transform`}>
              {method.icon}
            </div>

            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2 relative">{method.name}</h3>
            <p className="text-xl font-black text-gray-900 mb-10 relative italic tracking-tight">{method.value}</p>

            <div className={`mt-auto w-full ${method.color} text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200 group-hover:shadow-xl group-hover:scale-[1.02] active:scale-95 transition-all`}>
              {method.label}
            </div>
          </a>
        ))}
      </div>

      <div className="mt-20 bg-gray-900 rounded-[4rem] p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-emerald-600/10 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2"> GIVEBACK</h2>
            <p className="text-emerald-400 font-bold text-sm italic">41 Nguyễn Quảng, Tỉnh Gia Lai, Việt Nam</p>
            <p className="text-gray-400 text-xs mt-4 uppercase font-black tracking-widest">Thời gian hỗ trợ: 08:00 - 20:00 hàng ngày</p>
          </div>
          <div className="flex -space-x-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-16 h-16 rounded-full border-4 border-gray-900 bg-emerald-600 flex items-center justify-center font-black text-xl italic shadow-2xl">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
            <div className="w-16 h-16 rounded-full border-4 border-gray-900 bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-xs">
              +99
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
