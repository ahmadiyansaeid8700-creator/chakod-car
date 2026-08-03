export default function HomeExperienceOverrides() {
  return (
    <style>{`
      :root {
        --chakod-canvas: #f8f7ff;
        --chakod-surface: #ffffff;
        --chakod-ink: #17132f;
        --chakod-muted: #6f6984;
        --chakod-line: #e5e0f2;
        --chakod-green: #6d35dc;
        --chakod-green-dark: #5120b8;
        --chakod-sage: #eee8ff;
        --chakod-sage-deep: #d9ccfa;
        --chakod-sand: #f2edff;
        --chakod-shadow: 0 18px 54px rgba(74, 42, 139, 0.09);
        --chakod-shadow-strong: 0 26px 70px rgba(74, 42, 139, 0.14);
      }

      .chakodMasterHome {
        color: var(--chakod-ink);
        background:
          radial-gradient(circle at 7% 6%, rgba(126, 75, 232, 0.1), transparent 28rem),
          linear-gradient(180deg, #ffffff 0%, var(--chakod-canvas) 52%, #ffffff 100%);
      }

      .masterHeader {
        position: sticky;
        top: 0;
        z-index: 1100;
        padding: 0;
        border-bottom: 1px solid rgba(210, 211, 204, 0.82);
        background: rgba(255, 255, 255, 0.94);
        box-shadow: none;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }

      .masterNav {
        width: min(1280px, calc(100% - 48px));
        min-height: 78px;
        margin: 0 auto;
        padding: 0;
        gap: 30px;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
      }

      .masterBrandLogoDesktop {
        width: 136px;
        height: 48px;
        object-fit: contain;
      }

      .masterNavLinks {
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
        gap: 28px;
        color: #475049;
        font-size: 13px;
        font-weight: 800;
      }

      .masterNavLinks a {
        position: relative;
        padding: 28px 0;
        transition: color 160ms ease;
      }

      .masterNavLinks a::after {
        position: absolute;
        right: 0;
        bottom: 20px;
        width: 0;
        height: 2px;
        border-radius: 999px;
        background: var(--chakod-green);
        content: "";
        transition: width 180ms ease;
      }

      .masterNavLinks a:hover {
        color: var(--chakod-green);
      }

      .masterNavLinks a:hover::after {
        width: 100%;
      }

      .masterNavActions {
        gap: 8px;
      }

      .masterSavedLink,
      .masterSubmitButton {
        min-height: 44px;
        padding: 0 14px;
        border-radius: 12px;
        font-size: 11px;
      }

      .masterSavedLink {
        border-color: var(--chakod-line);
        color: #3f4741;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: none;
      }

      .masterSubmitButton {
        color: #ffffff;
        background: var(--chakod-green);
        box-shadow: 0 10px 26px rgba(23, 109, 73, 0.2);
      }

      .masterSubmitButton:hover {
        background: var(--chakod-green-dark);
        box-shadow: 0 14px 32px rgba(23, 109, 73, 0.25);
      }

      .chakodMasterHome .authStatus {
        min-width: 136px;
        min-height: 44px;
        border-color: var(--chakod-line);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.72);
      }

      .chakodMasterHome .authAvatar {
        border-radius: 10px;
        background: var(--chakod-green);
      }

      .chakodMasterHome .authStatusGuest .authAvatar {
        color: var(--chakod-green);
        background: var(--chakod-sage);
      }

      .masterHeaderToolsWrap {
        border-top: 1px solid rgba(222, 223, 216, 0.75);
        background: rgba(249, 247, 255, 0.86);
      }

      .masterHeaderTools {
        width: min(1280px, calc(100% - 48px));
        margin: 0 auto;
        padding: 9px 0 11px;
        grid-template-columns: minmax(220px, 270px) minmax(0, 1fr);
        gap: 11px;
      }

      .masterLocationControl,
      .masterSearch {
        min-height: 50px;
        border: 1px solid var(--chakod-line);
        border-radius: 13px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: none;
      }

      .masterLocationControl .homeLocationTrigger {
        width: 100%;
        max-width: none;
        min-height: 48px;
        padding: 5px 8px;
        border: 0;
        border-radius: 12px;
        color: var(--chakod-ink);
        background: transparent;
        box-shadow: none;
      }

      .masterLocationControl .homeLocationPin {
        width: 35px;
        height: 35px;
        border-radius: 11px;
        color: var(--chakod-green);
        background: var(--chakod-sage);
      }

      .masterLocationControl .homeLocationArrow {
        color: var(--chakod-green);
      }

      .masterLocationControl .homeLocationTrigger small {
        color: #7a817b;
        font-size: 9px;
      }

      .masterLocationControl .homeLocationTrigger strong {
        color: var(--chakod-ink);
        font-size: 11px;
      }

      .masterSearch {
        padding: 4px 5px 4px 14px;
        gap: 10px;
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease,
          background 160ms ease;
      }

      .masterSearch:focus-within {
        border-color: var(--chakod-green);
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(23, 109, 73, 0.1);
      }

      .masterSearchLeadingIcon {
        display: grid;
        place-items: center;
        color: var(--chakod-green);
      }

      .masterSearch input {
        color: var(--chakod-ink);
        font-size: 13px;
      }

      .masterSearch input::placeholder {
        color: #888e89;
      }

      .masterSearch button {
        min-width: 104px;
        min-height: 40px;
        border-radius: 10px;
        background: var(--chakod-green);
        box-shadow: none;
      }

      .masterSearch button:hover {
        background: var(--chakod-green-dark);
      }

      .masterSearchButtonIcon {
        display: none;
      }

      .chakodEditorialHero {
        display: grid;
        grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
        gap: clamp(42px, 6vw, 86px);
        align-items: center;
        width: min(1280px, calc(100% - 48px));
        min-height: 650px;
        margin: 0 auto;
        padding: 54px 0 64px;
      }

      .chakodEditorialHeroCopy {
        position: relative;
        z-index: 2;
      }

      .chakodEditorialEyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--chakod-green);
        font-size: 12px;
        font-weight: 900;
      }

      .chakodEditorialHero h1 {
        max-width: 650px;
        margin: 18px 0 20px;
        color: var(--chakod-ink);
        font-size: clamp(45px, 5vw, 72px);
        line-height: 1.26;
        letter-spacing: -2.8px;
      }

      .chakodEditorialHero h1 strong {
        display: block;
        color: var(--chakod-green);
        font: inherit;
      }

      .chakodEditorialHeroCopy > p {
        max-width: 590px;
        margin: 0;
        color: var(--chakod-muted);
        font-size: 16px;
        line-height: 2.05;
      }

      .chakodEditorialActions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 28px;
      }

      .chakodEditorialActions a {
        display: inline-flex;
        min-height: 50px;
        align-items: center;
        justify-content: center;
        gap: 9px;
        padding: 0 20px;
        border: 1px solid var(--chakod-line);
        border-radius: 12px;
        color: #384139;
        background: rgba(255, 255, 255, 0.72);
        font-size: 12px;
        font-weight: 900;
        transition:
          transform 160ms ease,
          background 160ms ease,
          box-shadow 160ms ease;
      }

      .chakodEditorialActions a:first-child {
        border-color: var(--chakod-green);
        color: #ffffff;
        background: var(--chakod-green);
        box-shadow: 0 13px 28px rgba(23, 109, 73, 0.21);
      }

      .chakodEditorialActions a:hover {
        transform: translateY(-2px);
      }

      .chakodEditorialActions a:first-child:hover {
        background: var(--chakod-green-dark);
      }

      .chakodEditorialStats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        max-width: 620px;
        margin: 34px 0 0;
        padding: 23px 0 0;
        border-top: 1px solid var(--chakod-line);
      }

      .chakodEditorialStats > div {
        padding: 0 18px;
      }

      .chakodEditorialStats > div:first-child {
        padding-right: 0;
      }

      .chakodEditorialStats > div:not(:last-child) {
        border-left: 1px solid var(--chakod-line);
      }

      .chakodEditorialStats dt {
        color: var(--chakod-muted);
        font-size: 10px;
      }

      .chakodEditorialStats dd {
        margin: 6px 0 0;
        color: var(--chakod-ink);
        font-size: 18px;
        font-weight: 900;
      }

      .chakodEditorialHeroMedia {
        position: relative;
        min-height: 550px;
      }

      .chakodEditorialHeroMedia::before {
        position: absolute;
        inset: 36px -32px -28px 17%;
        z-index: 0;
        border-radius: 50% 8% 43% 14%;
        background: rgba(167, 147, 116, 0.14);
        content: "";
      }

      .chakodEditorialHeroMedia > img {
        position: absolute;
        inset: 0;
        z-index: 1;
        width: 100%;
        height: 100%;
        border-radius: 52px 8px 52px 8px;
        object-fit: cover;
        box-shadow: 0 30px 80px rgba(38, 45, 39, 0.13);
      }

      .chakodEditorialVerified,
      .chakodEditorialNote {
        position: absolute;
        z-index: 2;
        border: 1px solid rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.9);
        box-shadow: var(--chakod-shadow);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .chakodEditorialVerified {
        right: -28px;
        bottom: 38px;
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 250px;
        padding: 12px 14px;
        border-radius: 16px;
      }

      .chakodEditorialVerified > span {
        display: grid;
        width: 40px;
        height: 40px;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 13px;
        color: var(--chakod-green);
        background: var(--chakod-sage);
      }

      .chakodEditorialVerified strong,
      .chakodEditorialVerified small,
      .chakodEditorialNote span,
      .chakodEditorialNote strong {
        display: block;
      }

      .chakodEditorialVerified strong {
        font-size: 11px;
      }

      .chakodEditorialVerified small {
        margin-top: 3px;
        color: var(--chakod-muted);
        font-size: 8px;
      }

      .chakodEditorialNote {
        top: 32px;
        left: -22px;
        padding: 12px 15px;
        border-radius: 15px;
      }

      .chakodEditorialNote span {
        color: var(--chakod-green);
        font-size: 8px;
        font-weight: 900;
      }

      .chakodEditorialNote strong {
        margin-top: 4px;
        font-size: 11px;
      }

      .masterQuickAccess {
        width: min(1280px, calc(100% - 48px));
        margin: 0 auto;
        padding: 4px 0 24px;
      }

      .masterQuickTrack {
        display: grid;
        grid-template-columns: repeat(8, minmax(0, 1fr));
        gap: 12px;
      }

      .masterQuickItem {
        min-width: 0;
        min-height: 108px;
        padding: 13px 8px;
        border: 1px solid rgba(218, 220, 212, 0.92);
        border-radius: 21px;
        color: #39423b;
        background: rgba(255, 255, 255, 0.76);
        box-shadow: 0 10px 30px rgba(28, 42, 32, 0.045);
      }

      .masterQuickItem:hover {
        transform: translateY(-3px);
        border-color: var(--chakod-sage-deep);
        box-shadow: var(--chakod-shadow);
      }

      .masterQuickItem > span {
        width: 51px;
        height: 51px;
        border: 0;
        border-radius: 16px;
        color: var(--chakod-green);
        background: var(--chakod-sage);
        box-shadow: none;
      }

      .masterQuickItem--showrooms > span {
        color: #47665f;
        background: #e2ece9;
      }

      .masterQuickItem--service > span {
        color: #8a603d;
        background: #f0e6d9;
      }

      .masterQuickItem > strong {
        color: inherit;
        font-size: 10px;
        line-height: 1.65;
      }

      .masterStoriesWrap {
        width: min(1280px, calc(100% - 48px));
        margin: 0 auto 8px;
        padding: 17px 19px 9px;
        border: 1px solid var(--chakod-line);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.74);
        box-shadow: 0 12px 34px rgba(74, 42, 139, 0.05);
      }

      .masterStoriesWrap--top {
        margin-top: 18px;
        margin-bottom: 12px;
      }

      .dealerAdBanner {
        position: relative;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 18px;
        width: min(1280px, calc(100% - 48px));
        min-height: 126px;
        margin: 0 auto;
        padding: 22px 26px;
        overflow: hidden;
        border: 1px solid #ded3fb;
        border-radius: 24px;
        color: #ffffff;
        background:
          radial-gradient(circle at 12% 20%, rgba(255,255,255,.18), transparent 19rem),
          linear-gradient(115deg, #391078 0%, #6428cc 48%, #8c5cf0 100%);
        box-shadow: 0 20px 54px rgba(87, 41, 175, 0.2);
      }

      .dealerAdBanner::after {
        position: absolute;
        left: -45px;
        bottom: -95px;
        width: 240px;
        height: 240px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 50%;
        content: "";
      }

      .dealerAdIcon {
        display: grid;
        width: 54px;
        height: 54px;
        place-items: center;
        border: 1px solid rgba(255,255,255,.34);
        border-radius: 17px;
        background: rgba(255,255,255,.14);
        backdrop-filter: blur(10px);
      }

      .dealerAdCopy {
        position: relative;
        z-index: 1;
      }

      .dealerAdCopy span {
        display: block;
        margin-bottom: 5px;
        color: #dfd0ff;
        font-size: 10px;
        font-weight: 900;
      }

      .dealerAdCopy strong {
        display: block;
        font-size: 19px;
        line-height: 1.7;
      }

      .dealerAdCopy p {
        margin: 2px 0 0;
        color: rgba(255,255,255,.76);
        font-size: 11px;
        line-height: 1.8;
      }

      .dealerAdActions {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .dealerAdActions a {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        padding: 0 16px;
        border: 1px solid rgba(255,255,255,.28);
        border-radius: 12px;
        color: #ffffff;
        font-size: 10px;
        font-weight: 900;
      }

      .dealerAdActions a:first-child {
        border-color: #ffffff;
        color: #5520b6;
        background: #ffffff;
        box-shadow: 0 10px 24px rgba(35,10,83,.18);
      }

      .dealerAdActions a:hover {
        transform: translateY(-2px);
      }

      .masterStoriesWrap .storyTopbar > strong {
        color: var(--chakod-ink);
        font-size: 13px;
      }

      .masterStoriesWrap .storyRing {
        background: conic-gradient(
          from 0deg,
          var(--chakod-green-dark),
          #9e6cf4,
          #c8a5ff,
          #7440d6,
          var(--chakod-green-dark)
        );
        box-shadow: 0 7px 18px rgba(109, 53, 220, 0.18);
      }

      .masterStoriesWrap .storyAvatar {
        background: var(--chakod-sage);
      }

      .masterStoriesWrap .storyAvatar b,
      .masterStoriesWrap .storyItem > strong {
        color: var(--chakod-ink);
      }

      .masterSection,
      .chakodServiceSection {
        width: min(1280px, calc(100% - 48px));
        margin: 22px auto 0;
        padding: 30px;
        border: 1px solid rgba(218, 220, 212, 0.88);
        border-radius: 27px;
        background: rgba(255, 255, 255, 0.86);
        box-shadow: 0 16px 45px rgba(28, 42, 32, 0.05);
      }

      .masterSection--luxury {
        background: linear-gradient(145deg, #eee9df 0%, #ffffff 62%);
      }

      .masterSection--freezone {
        background: linear-gradient(145deg, #e7f0ec 0%, #ffffff 62%);
      }

      .masterSection--economic {
        background: linear-gradient(145deg, #f3ebdc 0%, #ffffff 62%);
      }

      .masterSectionHeader {
        align-items: end;
        margin-bottom: 18px;
      }

      .masterSectionHeader span,
      .masterSectionTitleBlock > span {
        color: var(--chakod-green);
        letter-spacing: 0.4px;
      }

      .masterSectionHeader h2 {
        color: var(--chakod-ink);
        font-size: clamp(22px, 2.25vw, 30px);
        letter-spacing: -0.6px;
      }

      .masterSectionHeaderSide > p {
        max-width: 430px;
        color: var(--chakod-muted);
        font-size: 11px;
        line-height: 1.9;
      }

      .masterShowAllLink,
      .masterClearSearch {
        min-height: 38px;
        border-color: var(--chakod-line);
        border-radius: 11px;
        color: var(--chakod-green);
        background: #ffffff;
        box-shadow: none;
      }

      .homeRailTrack {
        grid-auto-columns: minmax(270px, 302px);
        gap: 15px;
      }

      .homeRailControl {
        border-color: var(--chakod-line);
        border-radius: 11px;
        color: var(--chakod-green);
        box-shadow: none;
      }

      .masterListingCard,
      .showroomCard {
        border-color: var(--chakod-line);
        border-radius: 21px;
        box-shadow: 0 12px 34px rgba(28, 42, 32, 0.06);
      }

      .masterListingCard:hover,
      .showroomCard:hover {
        box-shadow: var(--chakod-shadow-strong);
      }

      .masterListingBadge {
        background: rgba(20, 45, 31, 0.84);
      }

      .masterListingCategory,
      .masterListingTopLine > span {
        color: var(--chakod-green-dark);
        background: var(--chakod-sage);
      }

      .masterListingPrice {
        color: var(--chakod-green-dark);
      }

      .masterListingFooter > a {
        background: var(--chakod-green);
      }

      .masterSellerAvatar {
        background: var(--chakod-green);
      }

      .masterDealerSection {
        border-color: #d8e2dc;
        background: linear-gradient(145deg, #e9f0ec 0%, #ffffff 64%);
      }

      .masterDealerHeader .masterSectionTitleBlock > span,
      .masterDealerShowAll {
        color: var(--chakod-green);
      }

      .masterDealerShowAll,
      .homeRailShell--dealers .homeRailControl {
        border-color: var(--chakod-sage-deep);
        color: var(--chakod-green);
      }

      .chakodServiceSection {
        background: #ffffff;
      }

      .chakodServiceHeading {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 18px;
      }

      .chakodServiceHeading span {
        color: var(--chakod-green);
        font-size: 10px;
        font-weight: 900;
      }

      .chakodServiceHeading h2 {
        margin: 5px 0 0;
        color: var(--chakod-ink);
        font-size: clamp(22px, 2.3vw, 30px);
      }

      .chakodServiceJoinLink {
        display: inline-flex;
        min-height: 42px;
        align-items: center;
        gap: 8px;
        padding: 0 14px;
        border-radius: 12px;
        color: var(--chakod-green);
        background: var(--chakod-sage);
        font-size: 11px;
        font-weight: 900;
        white-space: nowrap;
      }

      .chakodServiceScroller {
        display: grid;
        grid-template-columns: repeat(8, minmax(0, 1fr));
        gap: 9px;
      }

      .chakodServiceItem {
        min-width: 0;
        padding: 14px 7px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        border: 1px solid var(--chakod-line);
        border-radius: 17px;
        color: var(--chakod-ink);
        background: #ffffff;
        text-align: center;
        transition: 160ms ease;
      }

      .chakodServiceItem:hover {
        transform: translateY(-3px);
        border-color: var(--chakod-sage-deep);
        box-shadow: 0 12px 28px rgba(23, 109, 73, 0.08);
      }

      .chakodServiceIcon {
        display: grid;
        width: 47px;
        height: 47px;
        place-items: center;
        border-radius: 15px;
        color: var(--chakod-green);
        background: var(--chakod-sage);
      }

      .chakodServiceItem strong {
        font-size: 10px;
      }

      .chakodServiceItem small {
        min-height: 28px;
        color: var(--chakod-muted);
        font-size: 8px;
        line-height: 1.7;
      }

      .chakodServicePromoGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 16px;
      }

      .chakodServicePromo {
        position: relative;
        display: flex;
        min-height: 220px;
        flex-direction: column;
        gap: 16px;
        justify-content: space-between;
        overflow: hidden;
        padding: 24px;
        border-radius: 23px;
        color: #ffffff;
      }

      .chakodServicePromo::after {
        position: absolute;
        left: -52px;
        bottom: -92px;
        width: 210px;
        height: 210px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.09);
        content: "";
      }

      .chakodServicePromo--repair {
        background: linear-gradient(135deg, #13271c, #2d6448);
      }

      .chakodServicePromo--parts {
        background: linear-gradient(135deg, #6e4c31, #a57a55);
      }

      .chakodServicePromoBadge {
        width: fit-content;
        padding: 6px 10px;
        border-radius: 999px;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.13);
        font-size: 9px;
        font-weight: 900;
      }

      .chakodServicePromo h3 {
        max-width: 470px;
        margin: 0;
        color: #ffffff;
        font-size: 21px;
        line-height: 1.75;
      }

      .chakodServicePromo p {
        max-width: 480px;
        margin: 6px 0 0;
        color: rgba(255, 255, 255, 0.75);
        font-size: 11px;
        line-height: 1.9;
      }

      .chakodServicePromo b {
        position: relative;
        z-index: 1;
        display: inline-flex;
        width: 132px;
        min-height: 39px;
        align-items: center;
        justify-content: center;
        margin-top: auto;
        border-radius: 10px;
        color: #233229;
        background: #ffffff;
        font-size: 10px;
      }

      .masterTrustSection {
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.08);
        background:
          radial-gradient(circle at 87% -10%, rgba(210, 184, 143, 0.18), transparent 20rem),
          linear-gradient(135deg, #13271c 0%, #25543c 100%);
      }

      .masterTrustSection .masterSectionHeader span,
      .masterTrustSection .masterSectionHeader h2,
      .masterTrustSection .masterTrustGrid h3 {
        color: #ffffff;
      }

      .masterTrustGrid article {
        border-color: rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.07);
      }

      .masterTrustGrid article > span {
        color: #d7c39f;
      }

      .masterTrustGrid p {
        color: rgba(255, 255, 255, 0.7);
      }

      .masterFooter {
        margin-top: 28px;
        background: #131a15;
      }

      .masterFooterMain,
      .masterFooterBottom {
        width: min(1280px, calc(100% - 48px));
      }

      .masterFooterMain > div a:hover {
        color: #b8d0bc;
      }

      @media (max-width: 1080px) {
        .masterNavLinks {
          gap: 17px;
        }

        .masterNavLinks a:nth-child(4) {
          display: none;
        }

        .masterQuickTrack,
        .chakodServiceScroller {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }

      @media (max-width: 768px) {
        .chakodMasterHome {
          padding-bottom: 0;
        }

        .masterHeader {
          padding: 6px 0;
          background: rgba(250, 249, 245, 0.97);
        }

        .masterNav {
          display: none;
        }

        .masterHeaderToolsWrap {
          border: 0;
          background: transparent;
        }

        .masterHeaderTools {
          width: calc(100% - 20px);
          margin: 0 auto;
          padding: 0;
          display: grid;
          grid-template-columns: 38px minmax(104px, 29vw) minmax(0, 1fr);
          gap: 7px;
        }

        .masterHeaderToolsBrand {
          display: grid;
          width: 38px;
          height: 44px;
          place-items: center;
        }

        .masterHeaderToolsBrand img {
          width: 34px;
          height: 39px;
          object-fit: contain;
        }

        .masterLocationControl,
        .masterSearch {
          min-height: 44px;
          border-radius: 13px;
          background: #ffffff;
        }

        .masterLocationControl .homeLocationTrigger {
          width: 100%;
          max-width: none;
          min-height: 42px;
          padding: 4px 6px;
        }

        .masterLocationControl .homeLocationPin {
          width: 29px;
          height: 29px;
          border-radius: 9px;
        }

        .masterLocationControl .homeLocationPin svg {
          width: 16px;
          height: 16px;
        }

        .masterLocationControl .homeLocationTrigger small {
          display: none;
        }

        .masterLocationControl .homeLocationTrigger strong {
          margin: 0;
          font-size: 9px;
        }

        .masterSearch {
          min-width: 0;
          padding: 3px 4px 3px 8px;
          gap: 5px;
        }

        .masterSearchLeadingIcon {
          display: none;
        }

        .masterSearch input {
          min-width: 0;
          font-size: 10px;
        }

        .masterSearch button {
          width: 37px;
          min-width: 37px;
          min-height: 36px;
          padding: 0;
          border-radius: 10px;
        }

        .masterSearchButtonText {
          display: none;
        }

        .masterSearchButtonIcon {
          display: grid;
          place-items: center;
        }

        .chakodEditorialHero {
          grid-template-columns: 1fr;
          gap: 18px;
          width: calc(100% - 20px);
          min-height: 0;
          padding: 20px 0 22px;
        }

        .chakodEditorialHero h1 {
          margin: 8px 0 10px;
          font-size: clamp(31px, 9.7vw, 42px);
          line-height: 1.27;
          letter-spacing: -1.7px;
        }

        .chakodEditorialHeroCopy > p {
          font-size: 12px;
          line-height: 1.85;
        }

        .chakodEditorialActions {
          margin-top: 14px;
        }

        .chakodEditorialActions a {
          min-height: 44px;
          padding: 0 15px;
          border-radius: 11px;
          font-size: 10px;
        }

        .chakodEditorialStats {
          margin-top: 16px;
          padding-top: 12px;
        }

        .chakodEditorialStats > div {
          padding: 0 10px;
        }

        .chakodEditorialStats dt {
          font-size: 8px;
        }

        .chakodEditorialStats dd {
          font-size: 14px;
        }

        .chakodEditorialHeroMedia {
          min-height: 280px;
        }

        .chakodEditorialHeroMedia::before {
          inset: 25px -12px -15px 18%;
        }

        .chakodEditorialHeroMedia > img {
          border-radius: 33px 7px 33px 7px;
        }

        .chakodEditorialVerified {
          right: 10px;
          bottom: 12px;
          min-width: 210px;
          padding: 9px 10px;
          border-radius: 13px;
        }

        .chakodEditorialVerified > span {
          width: 34px;
          height: 34px;
        }

        .chakodEditorialVerified strong {
          font-size: 9px;
        }

        .chakodEditorialVerified small {
          font-size: 7px;
        }

        .chakodEditorialNote {
          top: 14px;
          left: 8px;
          padding: 9px 11px;
        }

        .masterQuickAccess {
          width: 100%;
          padding: 0 10px 10px;
          overflow: hidden;
        }

        .masterQuickTrack {
          display: flex;
          gap: 12px;
          margin-inline: -10px;
          padding: 2px 10px 9px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }

        .masterQuickTrack::-webkit-scrollbar {
          display: none;
        }

        .masterQuickItem {
          flex: 0 0 84px;
          min-height: 82px;
          padding: 5px 3px;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          scroll-snap-align: start;
        }

        .masterQuickItem > span {
          width: 50px;
          height: 50px;
          border-radius: 50%;
        }

        .masterQuickItem > strong {
          font-size: 9px;
          white-space: nowrap;
        }

        .masterStoriesWrap {
          width: calc(100% - 20px);
          margin: 0 auto 2px;
          padding: 8px 9px 3px;
          border-radius: 18px;
        }

        .masterStoriesWrap--top {
          margin-top: 5px;
          margin-bottom: 5px;
        }

        .dealerAdBanner {
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 9px;
          width: calc(100% - 20px);
          min-height: 0;
          padding: 12px;
          border-radius: 17px;
        }

        .dealerAdIcon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
        }

        .dealerAdCopy strong {
          font-size: 13px;
          line-height: 1.65;
        }

        .dealerAdCopy p {
          display: none;
        }

        .dealerAdActions {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .dealerAdActions a {
          min-height: 38px;
          padding: 0 8px;
          font-size: 9px;
        }

        .masterStoriesWrap .storyItem,
        .masterStoriesWrap .storySkeleton {
          min-width: 78px;
          max-width: 78px;
          flex-basis: 78px;
        }

        .masterSection,
        .chakodServiceSection {
          width: calc(100% - 20px);
          margin: 8px auto 0;
          padding: 16px 12px;
          border-radius: 20px;
          box-shadow: none;
        }

        .masterSectionHeader {
          margin-bottom: 10px;
        }

        .masterSectionHeader h2,
        .chakodServiceHeading h2 {
          font-size: 19px;
          line-height: 1.55;
        }

        .masterSectionHeaderSide {
          display: none;
        }

        .masterShowAllLink {
          min-height: 34px;
          padding: 0 10px;
          font-size: 9px;
        }

        .homeRailTrack {
          grid-auto-columns: min(76vw, 284px);
          gap: 10px;
        }

        .homeRailControls {
          display: none;
        }

        .masterListingImage {
          height: 178px;
        }

        .chakodServiceHeading {
          align-items: center;
          margin-bottom: 10px;
        }

        .chakodServiceJoinLink {
          min-height: 34px;
          padding: 0 10px;
          font-size: 8px;
        }

        .chakodServiceScroller {
          display: flex;
          gap: 10px;
          margin-inline: -12px;
          padding: 2px 12px 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }

        .chakodServiceScroller::-webkit-scrollbar {
          display: none;
        }

        .chakodServiceItem {
          flex: 0 0 88px;
          min-height: 104px;
          padding: 7px 4px;
          border: 0;
          background: transparent;
          scroll-snap-align: start;
        }

        .chakodServiceIcon {
          width: 54px;
          height: 54px;
          border-radius: 50%;
        }

        .chakodServiceItem strong {
          font-size: 9px;
          white-space: nowrap;
        }

        .chakodServiceItem small {
          display: none;
        }

        .chakodServicePromoGrid {
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 4px;
        }

        .chakodServicePromo {
          min-height: 188px;
          padding: 18px;
          border-radius: 18px;
        }

        .chakodServicePromo h3 {
          font-size: 17px;
          line-height: 1.75;
        }

        .chakodServicePromo p {
          font-size: 9px;
        }

        .chakodServicePromo b {
          width: 116px;
          min-height: 36px;
          font-size: 9px;
        }

        .masterTrustGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .masterTrustGrid article {
          min-height: 140px;
          padding: 13px;
          border-radius: 16px;
        }

        .masterTrustGrid h3 {
          font-size: 11px;
        }

        .masterTrustGrid p {
          font-size: 8px;
          line-height: 1.85;
        }

        .masterFooter {
          margin-top: 8px;
        }

        .masterFooterMain,
        .masterFooterBottom {
          width: 100%;
        }

        .masterFooterMain {
          padding: 25px 18px 17px;
          text-align: center;
        }

        .masterFooterMain > div {
          justify-content: center;
        }
      }

      @media (max-width: 390px) {
        .masterHeaderTools {
          grid-template-columns: 34px minmax(96px, 30vw) minmax(0, 1fr);
          gap: 5px;
        }

        .masterHeaderToolsBrand {
          width: 34px;
        }

        .masterHeaderToolsBrand img {
          width: 30px;
          height: 35px;
        }

        .masterSearch input {
          font-size: 9px;
        }

        .chakodEditorialHeroMedia {
          min-height: 250px;
        }

        .chakodEditorialStats dt {
          min-height: 24px;
        }

        .masterTrustGrid {
          grid-template-columns: 1fr;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .chakodEditorialActions a,
        .masterQuickItem,
        .masterListingCard,
        .showroomCard,
        .chakodServiceItem {
          transition: none;
        }
      }
    `}</style>
  );
}
