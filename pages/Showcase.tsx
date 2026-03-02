
import React from "react";
import { motion } from "framer-motion";
import { 
  Heart, 
  Shield, 
  Zap, 
  Users, 
  Globe, 
  ArrowRight, 
  CheckCircle, 
  Award,
  MessageSquare,
  MapPin,
  Gift
} from "lucide-react";

const Showcase: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Hero Section - Recipe 2 & 11 inspired */}
      <header className="relative h-screen flex items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-black uppercase tracking-[0.3em] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
              Dự án Báo cáo Công nghệ
            </span>
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] mb-8 uppercase">
              Give<span className="text-emerald-600">Back</span>
            </h1>
            <p className="text-xl md:text-2xl font-medium text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
              Nền tảng kết nối lòng nhân ái, tối ưu hóa quy trình từ thiện bằng công nghệ AI hiện đại.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 group">
                Khám phá ngay <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Xem tài liệu
              </button>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
          <div className="w-6 h-10 border-2 border-slate-400 rounded-full flex justify-center p-1">
            <div className="w-1 h-2 bg-slate-400 rounded-full" />
          </div>
        </div>
      </header>

      {/* Core Values - Recipe 1 inspired */}
      <section className="py-32 px-6 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-8">
                Sứ mệnh <br /> <span className="text-emerald-600">Của chúng tôi</span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                GiveBack không chỉ là một ứng dụng, mà là một hệ sinh thái số giúp minh bạch hóa các hoạt động thiện nguyện, kết nối trực tiếp người cho và người nhận một cách thông minh nhất.
              </p>
              <ul className="space-y-4">
                {[
                  "Minh bạch 100% dòng tiền và hiện vật",
                  "Ứng dụng AI Vision nhận diện đồ cũ",
                  "Kết nối cộng đồng Huynh Đệ nhân ái",
                  "Hệ thống vinh danh nhà hảo tâm"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="h-64 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center p-8 text-white">
                  <Heart className="w-20 h-20" />
                </div>
                <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center">
                  <Zap className="w-12 h-12 text-emerald-600" />
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center">
                  <Globe className="w-12 h-12 text-blue-600" />
                </div>
                <div className="h-64 bg-blue-600 rounded-[2.5rem] flex items-center justify-center p-8 text-white">
                  <Users className="w-20 h-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Recipe 8 inspired */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">Tính năng đột phá</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Công nghệ dẫn lối cho những tấm lòng vàng</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "AI Vision Scanning",
                desc: "Tự động nhận diện món đồ, phân loại và đề xuất mô tả chính xác 100% chỉ qua một tấm ảnh.",
                icon: <Zap className="w-6 h-6" />,
                color: "bg-amber-100 text-amber-600"
              },
              {
                title: "Real-time Tracking",
                desc: "Theo dõi tiến độ quyên góp của từng chiến dịch theo thời gian thực với biểu đồ trực quan.",
                icon: <Award className="w-6 h-6" />,
                color: "bg-emerald-100 text-emerald-600"
              },
              {
                title: "Smart Map Search",
                desc: "Tìm kiếm các điểm tiếp nhận từ thiện gần nhất tích hợp Google Maps Grounding.",
                icon: <MapPin className="w-6 h-6" />,
                color: "bg-blue-100 text-blue-600"
              },
              {
                title: "Community Hub",
                desc: "Không gian chia sẻ khoảnh khắc, bình luận và lan tỏa những câu chuyện nhân văn.",
                icon: <MessageSquare className="w-6 h-6" />,
                color: "bg-indigo-100 text-indigo-600"
              },
              {
                title: "Charity Auction",
                desc: "Tổ chức đấu giá các vật phẩm giá trị để gây quỹ cho các sứ mệnh cấp bách.",
                icon: <Gift className="w-6 h-6" />,
                color: "bg-rose-100 text-rose-600"
              },
              {
                title: "Admin Dashboard",
                desc: "Hệ thống quản trị mạnh mẽ, quản lý sứ mệnh, nhà hảo tâm và báo cáo chi tiết.",
                icon: <Shield className="w-6 h-6" />,
                color: "bg-slate-100 text-slate-600"
              }
            ].map((feat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="p-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] shadow-sm hover:shadow-xl transition-all"
              >
                <div className={`w-14 h-14 ${feat.color} rounded-2xl flex items-center justify-center mb-8`}>
                  {feat.icon}
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-4">{feat.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats - Recipe 8 inspired */}
      <section className="py-32 px-6 bg-emerald-600 text-white rounded-[4rem] mx-6 mb-32 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: "Người dùng", value: "...+" },
              { label: "Món quà trao đi", value: "..." },
              { label: "Sứ mệnh hoàn thành", value: "..." },
              { label: "Quỹ quyên góp", value: "..." }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-5xl md:text-7xl font-black tracking-tighter mb-2">{stat.value}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-100 dark:border-slate-800 text-center">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">GiveBack</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-12">
            © 2026 Dự án GIVEBACK - Vì một cộng đồng tốt đẹp hơn.
          </p>
          <div className="flex justify-center gap-8">
            <a href="#" className="text-slate-400 hover:text-emerald-600 transition-colors"><Globe className="w-5 h-5" /></a>
            <a href="#" className="text-slate-400 hover:text-emerald-600 transition-colors"><MessageSquare className="w-5 h-5" /></a>
            <a href="#" className="text-slate-400 hover:text-emerald-600 transition-colors"><Heart className="w-5 h-5" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Showcase;
