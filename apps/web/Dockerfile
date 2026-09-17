FROM node:24-alpine AS dependencies
WORKDIR /workspace
COPY package.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install --include=dev

FROM node:24-alpine AS builder
WORKDIR /workspace
COPY --from=dependencies /workspace/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@geolearn/web

FROM node:24-alpine AS migrator
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=dependencies /workspace/node_modules ./node_modules
COPY package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web/scripts apps/web/scripts
COPY apps/web/migrations apps/web/migrations
CMD ["npm", "run", "db:migrate", "--workspace=@geolearn/web"]

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/public ./apps/web/public
RUN mkdir -p /var/lib/geolearn/media && chown -R nextjs:nodejs /var/lib/geolearn
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
