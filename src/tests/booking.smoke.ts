import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Booking from '../schemas/Booking';

async function run() {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());

  try {
    const doc = await Booking.create({
      bookingType: 'hotel',
      bookingDate: new Date(),
      status: 'pending',
      createdBy: new mongoose.Types.ObjectId(),
      payment: { cost: 1000, fee: 0, mode: 'upi', status: 'paid', total: 1000, transactionDetails: { id: 'tx_1' } },
      userId: [new mongoose.Types.ObjectId()],
      bookingDetails: {
        status: 'confirmed',
        price: '1000',
        ifHotelBooked: {
          assignedRooms: null,
          checkIn: new Date(),
          checkOut: new Date(Date.now() + 86400000),
          adults: 1,
          childrens: 0,
          hotelGuests: [{ fullname: 'Test User' }],
          hotelId: new mongoose.Types.ObjectId(),
          rooms: 1,
          roomType: 'Deluxe',
          totalDays: 1
        }
      }
    });

  console.log('Booking created _id:', (doc as any)._id.toString());
  } finally {
  await mongoose.disconnect();
  await mem.stop();
  }
}

run().catch((e) => {
  process.exit(1);
});
