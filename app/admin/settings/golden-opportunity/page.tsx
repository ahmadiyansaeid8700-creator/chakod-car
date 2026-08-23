"use client";

export default function GoldenOpportunitySettingsPage() {
  return (
    <main dir="rtl" style={{padding:24,fontFamily:"Tahoma"}}>
      <h1>تنظیمات فرصت طلایی</h1>
      <p>مدیریت قیمت، ظرفیت، قوانین AI و بازگشت وجه.</p>

      <section>
        <label>هزینه بررسی فرصت طلایی</label>
        <input defaultValue="390000" />
      </section>

      <section>
        <label>ظرفیت هر استان</label>
        <input defaultValue="10" />
      </section>

      <section>
        <label>حداقل امتیاز AI</label>
        <input defaultValue="70" />
      </section>

      <section>
        <label>مدت نمایش (ساعت)</label>
        <input defaultValue="24" />
      </section>
    </main>
  );
}
