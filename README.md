## Next.js Shopping Website Side Project

## Description

This back-end system provides the necessary API interface for the front-end e-commerce website and handles core functions such as data storage, user authentication, and order processing. It uses MongoDB to store data and JWT for user authentication.

<center><img src="https://github.com/user-attachments/assets/245ba455-630f-44a8-8f63-a2bb1cb2a2f1" width="60%"/></center>

## Features
### User Management:
- User registration, login, and logout

### Product Management:
- Retrieve product list
- Get details of a specific product
- Fetch products by category

### Shopping Cart:
- Add items to the cart
- Update item quantities in the cart
- Remove items from the cart
- View cart contents
- Clear the cart

### Order Management:
- Create orders
- View order history for a user

### Favorites:
- Add items to favorites
- Remove items from favorites
- View favorites list

https://github.com/user-attachments/assets/22b943a6-992c-41f5-a699-f1376085a576

## Demo Link
> https://p-shopping-site-backend.vercel.app/

## Tools
- frontend
  - TypeScript
  - React
  - Next.js (Next 14)
  - Tailwind CSS
  - Material Tailwind
  - Axios
- backend
  - Node.js  
  - Express.js
  - MongoDB
  - MongoDB Atlas
  - JWT
  - bcrypt 

## Getting Started

Clone this repository and Frontend: https://github.com/mollychen7561/p-shoppingSite-frontend/

Both run the development CLI:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
(The backend will run on port 5001.)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### 📌 Notice
If you want to deploy to vercel and connect to MongoDB Atlas:
1. The frontend and backend may need to be deployed separately, as deploying them together often results in failure for me.
2. Go to backend project setting -> Integrations -> MongoDB Atlas Connect Account of the vercel project.
3. Go to MongoDB Atlas -> Database Access -> Use vercel-admin-user and its password in vercel as the MONGODB_URI of the project environment variable. Remember to add your JWT_SECRET and CORS_ORIGIN (front-end URL).
