const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Cart = require('../models/Cart');

// POST /cart - Add item to cart
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || !quantity) {
            return res.status(400).json({ message: 'Product ID and quantity are required' });
        }

        // User ID comes from authMiddleware
        const userId = req.user.id;

        // Check if product is already in cart
        let cartItem = await Cart.findOne({ user: userId, product: productId });

        if (cartItem) {
            cartItem.quantity += quantity;
            await cartItem.save();
        } else {
            cartItem = new Cart({
                user: userId,
                product: productId,
                quantity
            });
            await cartItem.save();
        }

        res.status(200).json({ message: 'Item added to cart', cartItem });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
