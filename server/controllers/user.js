import User from '../models/user.js'
import Lead from '../models/lead.js'
import { createError } from '../utils/error.js'
import bcrypt from 'bcryptjs'
import validator from 'validator'

export const getUsers = async (req, res, next) => {
    try {

        const users = await User.find()
        res.status(200).json({ result: users, message: 'users fetched seccessfully', success: true })

    } catch (err) {
        next(createError(500, err.message))

    }
}

export const getUser = async (req, res, next) => {
    try {

        const { userId } = req.params
        const findedUser = await User.findById(userId)
        if (!findedUser) return next(createError(401, 'User not exist'))

        res.status(200).json({ result: findedUser, message: 'user fetched seccessfully', success: true })

    } catch (err) {
        next(createError(500, err.message))

    }
}

export const filterUser = async (req, res, next) => {
    const { startingDate, endingDate, ...filters } = req.query;
    try {
        let query = await User.find(filters)

        // Check if startingDate is provided and valid
        if (startingDate && isValidDate(startingDate)) {
            const startDate = new Date(startingDate);
            startDate.setHours(0, 0, 0, 0);

            // Add createdAt filtering for startingDate
            query = query.where('createdAt').gte(startDate);
        }

        // Check if endingDate is provided and valid
        if (endingDate && isValidDate(endingDate)) {
            const endDate = new Date(endingDate);
            endDate.setHours(23, 59, 59, 999);

            // Add createdAt filtering for endingDate
            if (query.model.modelName === 'User') { // Check if the query has not been executed yet
                query = query.where('createdAt').lte(endDate);
            }
        }
        if (query.length > 0) {
            query = await query.populate('userId').exec();
        }
        res.status(200).json({ result: query });

    } catch (error) {
        next(createError(500, error.message));
    }
};


export const getClients = async (req, res, next) => {
    try {

        const findedClients = await User.find({ role: 'client' })
        res.status(200).json({ result: findedClients, message: 'clients fetched seccessfully', success: true })

    } catch (err) {
        next(createError(500, err.message))

    }
}

export const getEmployeeClients = async (req, res, next) => {
    try {
        let allClients = await User.find({ role: 'client' })
        const employeeLeads = await Lead.find({ allocatedTo: { $in: req.user?._id }, isArchived: false })

        // Filter clients based on the condition
        allClients = allClients.filter((client) => {
            return employeeLeads.findIndex(lead => lead.clientPhone.toString() === client.phone.toString()) !== -1
        });

        res.status(200).json({ result: allClients, message: 'clients fetched successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const getEmployees = async (req, res, next) => {
    try {

        const findedEmployees = await User.find({ role: 'employee' })
        res.status(200).json({ result: findedEmployees, message: 'employees fetched seccessfully', success: true })

    } catch (err) {
        next(createError(500, err.message))
    }
}

export const createClient = async (req, res, next) => {
    try {
        const { firstName, lastName, phone, email, city } = req.body

        // Validate required fields (based on userSchema: firstName, lastName, phone are required)
        if (!firstName) return next(createError(400, 'First name is required'))
        if (!lastName) return next(createError(400, 'Last name is required'))
        if (!phone) return next(createError(400, 'Phone number is required'))

        // Validate field lengths
        if (firstName.trim().length < 2) return next(createError(400, 'First name must be at least 2 characters'))
        if (lastName.trim().length < 2) return next(createError(400, 'Last name must be at least 2 characters'))
        
        // Validate phone format (basic validation: must be digits and reasonable length)
        const phoneRegex = /^[0-9]{10,15}$/
        if (!phoneRegex.test(phone)) return next(createError(400, 'Phone number must be 10-15 digits'))

        // Validate email format if provided
        if (email && !validator.isEmail(email)) return next(createError(400, 'Invalid email format'))

        // Check if phone already exists
        const findedUserByPhone = await User.findOne({ phone })
        if (Boolean(findedUserByPhone)) return next(createError(400, 'Phone number already exists'))

        // Check if email already exists (only if email is provided)
        if (email) {
            const findedUser = await User.findOne({ email })
            if (Boolean(findedUser)) return next(createError(400, 'Email already exists'))
        }

        // Generate username for client based on phone (clients don't use username for login)
        const username = `client_${phone}`

        const result = await User.create({ ...req.body, username, role: 'client' })
        res.status(200).json({ result, message: 'client created seccessfully', success: true })

    } catch (err) {
        next(createError(500, err.message))
    }
}
export const createEmployee = async (req, res, next) => {
    try {
        const { firstName, lastName, username, phone, email, password, city } = req.body

        // Validate required fields
        if (!firstName) return next(createError(400, 'First name is required'))
        if (!lastName) return next(createError(400, 'Last name is required'))
        if (!username) return next(createError(400, 'Username is required'))
        if (!phone) return next(createError(400, 'Phone number is required'))
        if (!password) return next(createError(400, 'Password is required'))

        // Validate field lengths
        if (firstName.trim().length < 2) return next(createError(400, 'First name must be at least 2 characters'))
        if (lastName.trim().length < 2) return next(createError(400, 'Last name must be at least 2 characters'))
        if (username.trim().length < 3) return next(createError(400, 'Username must be at least 3 characters'))
        if (password.length < 6) return next(createError(400, 'Password must be at least 6 characters'))

        // Validate phone format (basic validation: must be digits and reasonable length)
        const phoneRegex = /^[0-9]{10,15}$/
        if (!phoneRegex.test(phone)) return next(createError(400, 'Phone number must be 10-15 digits'))

        // Validate email format if provided
        if (email && !validator.isEmail(email)) return next(createError(400, 'Invalid email format'))

        const findedUser = await User.findOne({ username })
        if (Boolean(findedUser)) return next(createError(400, 'Username already exists'))

        const findedUserByPhone = await User.findOne({ phone })
        if (Boolean(findedUserByPhone)) return next(createError(400, 'Phone number already exists'))

        // Check if email already exists (only if email is provided)
        if (email) {
            const findedUserByEmail = await User.findOne({ email })
            if (Boolean(findedUserByEmail)) return next(createError(400, 'Email already exists'))
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)

        const result = await User.create({ ...req.body, password: hashedPassword, role: 'employee' })
        res.status(200).json({ result, message: 'employee created seccessfully', success: true })

    } catch (err) {
        next(createError(500, err.message))
    }
}

export const updateRole = async (req, res, next) => {
    try {

        const { userId } = req.params
        const { role } = req.body

        const findedUser = await User.findById(userId)
        if (!findedUser) return next(createError(401, 'User not exist'))

        const updatedUser = await User.findByIdAndUpdate(userId, { role }, { new: true })
        res.status(200).json({ reuslt: updatedUser, message: 'Role updated successfully', success: true })

    } catch (err) {
        next(createError(500, err.message))
    }
}

export const deleteUser = async (req, res, next) => {
    try {
        const { userId } = req.params
        const findedUser = await User.findById(userId)
        if (!findedUser) return next(createError(400, 'User not exist'))

        const deletedUser = await User.findByIdAndDelete(userId)
        res.status(200).json({ result: deletedUser, message: 'User deleted successfully', success: true })

    } catch (err) {
        next(createError(500, err.message))
    }
}

export const deleteWholeCollection = async (req, res, next) => {
    try {

        const result = await User.deleteMany()
        res.status(200).json({ result, message: 'User collection deleted successfully', success: true })

    } catch (err) {
        next(createError(500, err.message))
    }
}
