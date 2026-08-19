const retiredPayload = {
  error: "رزرو بنر قدیمی بازنشسته شده است.",
  code: "LEGACY_BANNER_RESERVATION_RETIRED",
  replacements: {
    featuredShowroom: "/account/business/promotions/featured",
    businessPlacement: "/advertising/business-placement",
  },
};

export async function GET() {
  return Response.json(retiredPayload, { status: 410 });
}

export async function POST() {
  return Response.json(retiredPayload, { status: 410 });
}
