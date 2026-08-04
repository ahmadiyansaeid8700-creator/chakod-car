"use client";

type ListingStoryBoxProps = {
  listingId: number;
};

export default function StoryBox({ listingId }: ListingStoryBoxProps) {
  return (
    <section className="storyBox">
      <div className="storyBoxHead">
        <div>
          <span className="storyBoxLabel">استوری آگهی</span>
          <h2>نمایش ویژه آگهی در استوری‌های چاکود</h2>
          <p>
            این بخش برای مدیریت استوری آگهی شماره{" "}
            <strong>{listingId.toLocaleString("fa-IR")}</strong> آماده است.
          </p>
        </div>

        <div className="storyBoxBadge">استوری</div>
      </div>

      <div className="storyBoxBody">
        <div className="storyBoxInfo">
          <strong>وضعیت فعلی</strong>
          <span>هنوز استوری فعالی برای این آگهی ثبت نشده است.</span>
        </div>

        <a
          className="storyBoxLink"
          href={`/cars/${listingId}`}
          target="_blank"
          rel="noreferrer"
        >
          مشاهده آگهی
        </a>
      </div>

      <style>{`
        .storyBox {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #eadcff;
          border-radius: 30px;
          padding: 26px;
          box-shadow: 0 24px 70px rgba(76, 29, 149, 0.10);
          backdrop-filter: blur(12px);
        }

        .storyBoxHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .storyBoxLabel {
          display: inline-block;
          color: #6d28d9;
          background: #f4ecff;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .storyBox h2 {
          margin: 0;
          color: #211335;
          font-size: 20px;
          line-height: 1.8;
        }

        .storyBox p {
          margin: 10px 0 0;
          color: #6d5b83;
          font-size: 13px;
          line-height: 2;
        }

        .storyBox p strong {
          color: #6d28d9;
        }

        .storyBoxBadge {
          min-width: 72px;
          height: 72px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          color: #fff;
          font-weight: 900;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          box-shadow: 0 14px 32px rgba(109, 40, 217, 0.22);
        }

        .storyBoxBody {
          margin-top: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 16px;
          border: 1px solid #eadcff;
          background: #fbf8ff;
          border-radius: 22px;
        }

        .storyBoxInfo {
          display: grid;
          gap: 5px;
        }

        .storyBoxInfo strong {
          color: #211335;
          font-size: 13px;
        }

        .storyBoxInfo span {
          color: #7b6a91;
          font-size: 12px;
          line-height: 1.9;
        }

        .storyBoxLink {
          flex-shrink: 0;
          color: #fff;
          text-decoration: none;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 800;
        }

        @media (max-width: 640px) {
          .storyBox {
            border-radius: 24px;
            padding: 20px;
          }

          .storyBoxHead,
          .storyBoxBody {
            flex-direction: column;
          }

          .storyBoxBadge {
            width: 100%;
            height: 54px;
            border-radius: 18px;
          }

          .storyBoxLink {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}
