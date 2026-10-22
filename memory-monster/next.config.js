// The site is fully static. Vercel builds it as normal. The desktop app sets MM_EXPORT=1 to get
// plain files in out/ that it can serve to itself, with no Vercel and no internet needed.
const exporting = process.env.MM_EXPORT === "1";

const nextConfig = {
  reactStrictMode: true,
  ...(exporting ? { output: "export" } : {}),
};

export default nextConfig;
