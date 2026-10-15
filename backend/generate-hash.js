import bcrypt from 'bcryptjs';

const passwordToHash = process.argv[2] || '12345';

const generateHash = async () => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(passwordToHash, salt);
  
  console.log('\n--- BCRYPT HASH GENERATOR ---');
  console.log(`Password: ${passwordToHash}`);
  console.log(`Hash (Copy this into MongoDB): \n${hash}\n`);
};

generateHash();
