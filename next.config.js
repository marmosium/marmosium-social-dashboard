/** @type {import('next').NextConfig} */
const nextConfig = {
  // archiver (ve bağımlılıklarından biri) webpack'in tanımadığı bir "exports"
  // sıralamasına sahip; bu paketi sunucu tarafında dışarıda bırakıp
  // doğrudan Node'a çözümletmek "Default condition should be last one"
  // derleme hatasını çözüyor.
  experimental: {
    serverComponentsExternalPackages: ['archiver'],
  },
}

module.exports = nextConfig
