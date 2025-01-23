// import Stripe from 'stripe';
// import { db } from '../../src/lib/firebase/config';
// import { doc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';

// const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY);

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// async function getRawBody(req) {
//   const chunks = [];
//   for await (const chunk of req) {
//     chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
//   }
//   return Buffer.concat(chunks);
// }

// export async function POST(req) {
//   try {
//     const rawBody = await getRawBody(req);
//     const sig = req.headers.get('stripe-signature');

//     let event;

//     try {
//       event = stripe.webhooks.constructEvent(
//         rawBody,
//         sig,
//         process.env.STRIPE_WEBHOOK_SECRET
//       );
//       console.log("Webhook event received:", event.type);
//     } catch (err) {
//       console.error('Webhook signature verification failed:', err.message);
//       return new Response(`Webhook Error: ${err.message}`, { status: 400 });
//     }

//     switch (event.type) {
//       case 'charge.succeeded':
//         const session = event.data.object.billing_details;
//         console.log('Charge succeeded - billing details:', session);
//         const amount = event.data.object.amount / 100;
//         await handleCheckoutSession(session, amount);
//         break;
//       default:
//         console.log(`Unhandled event type ${event.type}`);
//     }

//     return new Response(JSON.stringify({ received: true }), {
//       status: 200,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });
//   } catch (error) {
//     console.error('Webhook processing failed:', error);
//     return new Response(`Webhook Error: ${error.message}`, { status: 400 });
//   }
// }

// const handleCheckoutSession = async (session, amount) => {
//   const email = session.email;
//   const userId = await getUserIdByEmail(email);

//   if (userId) {
//     console.log(`Updating credits for user ${userId} with amount ${amount}`);
//     await updateUserCredits(userId, amount);
//   } else {
//     console.log(`No user found for email: ${email}`);
//   }
// };

// const getUserIdByEmail = async (email) => {
//   const usersRef = collection(db, 'users');
//   const q = query(usersRef, where('email', '==', email));
//   const snapshot = await getDocs(q);

//   if (!snapshot.empty) {
//     console.log(`User found for email ${email}:`, snapshot.docs[0].id);
//     return snapshot.docs[0].id;
//   }
//   console.log(`No user found for email: ${email}`);
//   return null;
// };

// const updateUserCredits = async (userId, amount) => {
//   const userRef = doc(db, 'users', userId);
//   console.log(`Updating credits for user ${userId} with amount ${amount}`);
//   await updateDoc(userRef, {
//     credits: increment(amount),
//   });
// };




// import express from 'express';
// import cors from 'cors';
// import Stripe from 'stripe';
// import dotenv from 'dotenv';

// dotenv.config();


// // const express = require('express');
// // const cors = require('cors');
// // const stripe = require('stripe')(import.meta.env.VITE_STRIPE_SECRET_KEY); 
// const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY); 

// const app = express();
// // app.use(cors());
// app.use(cors({ origin: 'http://localhost:5173' })); // Replace with your frontend URL

// app.use(express.json());

// app.post('/create-payment-intent', async (req, res) => {
//     const { amount } = req.body; // Amount should be in cents

//     try {
//         const paymentIntent = await stripe.paymentIntents.create({
//             amount,
//             currency: 'usd', // Change to your desired currency
//         });
//         res.status(200).send({ clientSecret: paymentIntent.client_secret });
//     } catch (error) {
//         res.status(500).send({ error: error.message });
//     }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// }); 


import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config.js';


dotenv.config();

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY);
const app = express();

app.use(cors({ origin: 'https://portraitify.vercel.app' })); // Replace with your frontend URL
// app.use(bodyParser.raw({ type: 'application/json' }));

// Webhook endpoint to handle Stripe events
app.post('/api/webhook',  express.raw({ type: 'application/json' }), async (req, res) => {
    // console.log('Raw body:', req.body.toString()); // Log the raw body
    const sig = req.headers['stripe-signature'];
    console.log('Signature:', sig);
    let event;

    console.log('Request details: ', req);
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        // console.log("webhook event: ", event)
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'charge.succeeded':
            const session = event.data.object.billing_details;
            console.log('Charge succeeded - billing details:', session);
            const amount = event.data.object.amount / 100;
            await handleCheckoutSession(session, amount); // Call the function to handle the checkout session
            break;
        // Handle other event types as needed
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
});

// Function to handle the checkout session
const handleCheckoutSession = async (session, amount) => {
    const email = session.email; // Get the email from the session
    const userId = await getUserIdByEmail(email); // Function to get user ID by email

    if (userId) {
        // const amount = session.amount / 100; // Convert from cents to dollars
        await updateUserCredits(userId, amount); // Function to update user credits
    } else {
        console.log(`No user found for email: ${email}`);
    }
};

// Function to get user ID by email
// const getUserIdByEmail = async (email) => {
//     const usersRef = db.collection('users'); // Adjust based on your Firestore structure
//     const snapshot = await usersRef.where('email', '==', email).get();

//     if (!snapshot.empty) {
//         return snapshot.docs[0].id; // Return the first matching user ID
//     }
//     return null; // No user found
// };


const getUserIdByEmail = async (email) => {
    const usersRef = collection(db, 'users'); // Use the collection function
    const q = query(usersRef, where('email', '==', email)); // Create a query
    const snapshot = await getDocs(q); // Use getDocs to fetch the documents

    if (!snapshot.empty) {
        console.log(`User found for email ${email}:`, snapshot.docs[0].id); // Log found user ID
        return snapshot.docs[0].id; // Return the first matching user ID
    }
    console.log(`No user found for email: ${email}`); // Log if no user found
    return null; // No user found
};


// Function to update user credits in Firebase
const updateUserCredits = async (userId, amount) => {
    const userRef = doc(db, 'users', userId);
    console.log(`Updating credits for user ${userId} with amount ${amount}`);
    await updateDoc(userRef, {
        credits: increment(amount), // Increment credits by the amount paid
    });
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});





// Export for Vercel
export default app;
