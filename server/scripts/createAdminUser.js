const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const Role = require('../models/Role');
const User = require('../models/User');

async function main() {
	try {
		await connectDB();

		const email = 'info@easysell.in';
		const plainPassword = 'Easysell@123';
		const name = 'EasySell Admin';

		let adminRole = await Role.findOne({ name: 'admin' });
		if (!adminRole) {
			console.log('Admin role not found. Please run the roles and permissions seeder first.');
			process.exit(1);
		}

		let existing = await User.findOne({ email });
		if (existing) {
			existing.password = plainPassword; // pre-save hook will hash
			existing.role = adminRole._id;
			existing.isActive = true;
			existing.department = 'IT';
			await existing.save();
			console.log('Updated existing user password and role:');
			console.log(`Email: ${email}`);
			console.log(`Password: ${plainPassword}`);
			process.exit(0);
		}

		const user = new User({
			name,
			email,
			password: plainPassword,
			role: adminRole._id,
			department: 'IT',
			isActive: true
		});

		await user.save();
		console.log('Created admin user:');
		console.log(`Email: ${email}`);
		console.log(`Password: ${plainPassword}`);
		process.exit(0);
	} catch (err) {
		console.error('Failed to create admin user:', err);
		process.exit(1);
	}
}

main();


