import 'dotenv/config';
import fetch from 'node-fetch';
import { Buffer } from 'buffer';

const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
const auth = "Basic " + Buffer.from(serverKey + ":").toString("base64");

async function testMidtrans() {
  console.log("Server Key:", serverKey.slice(0, 15) + "...");
  console.log("Auth header:", auth.slice(0, 20) + "...");
  
  // Test 1: Simple charge (bank_transfer)
  console.log("\n--- Test 1: bank_transfer ---");
  try {
    const response = await fetch("https://api.sandbox.midtrans.com/v2/charge", {
      method: "POST",
      headers: { 
        "Accept": "application/json", 
        "Content-Type": "application/json", 
        "Authorization": auth 
      },
      body: JSON.stringify({
        payment_type: "bank_transfer",
        transaction_details: { order_id: "test-bni-" + Date.now(), gross_amount: 10000 },
        bank_transfer: { bank: "bni" }
      }),
    });
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }

  // Test 2: QRIS
  console.log("\n--- Test 2: qris ---");
  try {
    const response = await fetch("https://api.sandbox.midtrans.com/v2/charge", {
      method: "POST",
      headers: { 
        "Accept": "application/json", 
        "Content-Type": "application/json", 
        "Authorization": auth 
      },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: { order_id: "test-qris-" + Date.now(), gross_amount: 10000 }
      }),
    });
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

testMidtrans();
