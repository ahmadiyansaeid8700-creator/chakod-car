const cars = [
  {
    title: "پژو ۲۰۷ اتوماتیک",
    model: "۱۴۰۱",
    city: "تهران",
    mileage: "۳۵٬۰۰۰ کیلومتر",
    price: "۱٬۰۵۰٬۰۰۰٬۰۰۰ تومان",
  },
  {
    title: "دنا پلاس توربو",
    model: "۱۴۰۲",
    city: "مشهد",
    mileage: "۱۸٬۰۰۰ کیلومتر",
    price: "۱٬۱۸۰٬۰۰۰٬۰۰۰ تومان",
  },
  {
    title: "تیبا ۲",
    model: "۱۳۹۹",
    city: "کرج",
    mileage: "۹۰٬۰۰۰ کیلومتر",
    price: "۳۴۵٬۰۰۰٬۰۰۰ تومان",
  },
];

export default function AdsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#0b1220] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">آگهی‌های خودرو</h1>
            <p className="mt-2 text-gray-400">
              لیست خودروهای ثبت‌شده در چاکود خودرو
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold hover:bg-white/10"
          >
            بازگشت به خانه
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cars.map((car) => (
            <div
              key={car.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl"
            >
              <div className="mb-5 h-40 rounded-2xl bg-gradient-to-br from-blue-600 to-slate-900" />

              <h2 className="text-xl font-black">{car.title}</h2>

              <div className="mt-5 space-y-3 text-sm text-gray-300">
                <p>مدل: {car.model}</p>
                <p>شهر: {car.city}</p>
                <p>کارکرد: {car.mileage}</p>
              </div>

              <div className="mt-6 rounded-2xl bg-blue-600/20 p-4">
                <p className="text-sm text-blue-200">قیمت</p>
                <p className="mt-1 text-lg font-black">{car.price}</p>
              </div>

              <button className="mt-5 w-full rounded-2xl bg-blue-600 py-3 font-bold hover:bg-blue-500">
                مشاهده جزئیات
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}