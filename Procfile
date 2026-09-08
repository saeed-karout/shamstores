release: npm --prefix backend run prisma:db-push && { npm --prefix backend run seed:features || echo "تحذير: تعذّر بذر الإضافات — النشر مستمرّ"; }
web: node backend/dist/server.js
