import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './src/config/db.js';
import { User } from './src/models/index.js';

const resetUser = async () => {
  await connectDB();
  
  const userEmail = 'student@example.com'; // 👈 Change this to the user's email
  const newPassword = 'MyNewPassword123';  // 👈 Change this to the new password

  const user = await User.findOne({ email: userEmail });
  if (!user) {
    console.log('User not found!');
  } else {
    user.password = newPassword;
    await user.save(); // The pre-save hook automatically hashes it!
    console.log('✅ Password successfully updated in DB for:', user.email);
  }
  
  await disconnectDB();
};

resetUser();