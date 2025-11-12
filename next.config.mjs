/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export',            // remplace définitivement `next export`
    // Optionnel mais pratique pour S3 Website endpoint (génère .../index.html)
    // trailingSlash: true,

    // Si tu utilises <Image />, désactive l’optimisation côté serveur sur un export statique
    // images: { unoptimized: true }
};

export default nextConfig;
