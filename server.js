const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for cross-origin requests

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'XXXX',
    password: 'XXXX',
    port: 'XXXX',
});

app.get('/menu', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM menu');
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data " + err.message);
        res.sendStatus(500);
    }
});

app.get('/employees', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees');
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data " + err.message);
        res.sendStatus(500);
    }
});

app.get('/stock', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM stock');
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data " + err.message);
        res.sendStatus(500);
    }
});


app.get('/stock/:rid', async (req, res) => {
    try {
        const rid = req.params.rid;
        const result = await pool.query('SELECT * FROM stock WHERE restaurant_id = $1', [rid]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data: " + err.message);
        res.sendStatus(500);  // Send HTTP status 500 for server error
    }
});




// Fetch data from PostgreSQL
app.get('/restaurant', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM restaurant');
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data " + err.message);
        res.sendStatus(500);
    }
});

app.get('/bank', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bank');
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data " + err.message);
        res.sendStatus(500);
    }
});

app.put('/bank', async (req, res) => {
    const { account, cost, balance } = req.body;
    let newBalance = (balance - cost).toFixed(2);
    try {
        await pool.query('BEGIN');
        await pool.query('UPDATE bank SET account_balance = $1 WHERE bank_account = $2', [newBalance, account]);
        await pool.query('COMMIT');
        res.sendStatus(200);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("Error in Updating Bank Account " + err.message);
        console.log("Error in Updating Bank Account " + err.message);
        res.sendStatus(500);
    }
});

app.put('/menu', async (req, res) => {
    const { itemDict, stockDict, rid } = req.body;
    // Ensure that both itemDict and stockDict are provided
    if (!itemDict || !stockDict) {
        return res.status(400).json({ error: 'Missing itemDict or stockDict in request body' });
    }
    try {
        // Begin a transaction to ensure atomicity
        await pool.query('BEGIN');
        for (const [menuItemId, quantity] of Object.entries(itemDict)) {
            if (quantity > 0) {  // Ensure quantity is greater than zero
                let newStock = stockDict[menuItemId] - quantity;
                // Only update if the new stock would be valid (non-negative)
                if (newStock >= 0) {
                    await pool.query(
                        'UPDATE stock SET stock = $1 WHERE item_id = $2 and restaurant_id = $3',
                        [newStock, menuItemId, rid]
                    );
                } else {
                    // If stock goes negative, rollback and return an error
                    await pool.query('ROLLBACK');
                    alert("Not enough stock for order");
                    return res.status(400).json({
                        error: `Cannot reduce stock for item ${menuItemId} below 0.`
                    });
                }
            }
        }
        // Commit the transaction
        await pool.query('COMMIT');
        res.status(200).json({ message: 'Stock updated successfully' });    
    } catch (err) {
        console.error("Error in Updating Stock: " + err.message);
        // If there is any error, roll back the transaction
        await pool.query('ROLLBACK');
        res.status(500).json({ error: 'Error updating stock' });
    }
});

app.get('/bank/:bank_account', async (req, res) => {
    const { bank_account } = req.params;
    try {
        const result = await pool.query('SELECT * FROM bank WHERE bank_account = $1', [bank_account]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data " + err.message);
        res.sendStatus(500);
    }
});

app.get('/employees/:rid', async (req, res) => {
    const { rid } = req.params;
    try {
        const result = await pool.query('SELECT * FROM employees WHERE restaurant_id = $1', [rid]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data " + err.message);
        res.sendStatus(500);
    }
});

app.get('/customer', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customer');
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data " + err.message);
        res.sendStatus(500);
    }
});

app.get('/order', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM order_data');
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data " + err.message);
        res.sendStatus(500);
    }
});

app.get('/transaction', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transaction');
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data " + err.message);
        res.sendStatus(500);
    }
});

app.put('/menus', async (req, res) => {
    const { foodItem, newPrice, newMemberPrice } = req.body;

    // Validate inputs
    if (!foodItem || !newPrice || !newMemberPrice) {
        return res.status(400).send('Invalid input');
    }

    try {
        // Update query to modify menu prices
        const result = await pool.query(
            `UPDATE menu
             SET cost = $1, member_cost = $2
             WHERE item_id = $3`,
            [newPrice, newMemberPrice, foodItem]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Menu item not found');
        }

        res.status(200).send('Menu item updated successfully');
    } catch (err) {
        console.error("Error updating menu item:", err.message);
        res.status(500).send('Server error');
    }
});


app.post('/transaction', async (req, res) => {
    const { cid, ba, rid, cost, itemDict, paymentMethod } = req.body;
    // Check for missing required fields
    if (!cid || !ba || !rid || !cost || !itemDict || !paymentMethod) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    // Get the current date and time
    let currentDate = new Date();
    // Format the date in YYYY-MM-DD HH:MM:SS format
    let formattedDate = currentDate.toISOString().slice(0, 19).replace("T", " ");
    try {
        // Begin transaction
        await pool.query('BEGIN');
        // Insert the main transaction record
        const transactionResult = await pool.query(
            'INSERT INTO transaction(cost, date, customer_id, payment_method, location_id) VALUES ($1, $2, $3, $4, $5) RETURNING tid',
            [cost, formattedDate, cid, paymentMethod, rid]
        );
        const transactionId = transactionResult.rows[0].tid;
        // Loop through itemDict and insert each item into a transaction_items table
        for (const [menuItemId, quantity] of Object.entries(itemDict)) {
            if (quantity > 0) {  // Ensure quantity is greater than zero
                await pool.query(
                    'INSERT INTO order_data(transaction_id, menu_item, restaurant_id, quantity) VALUES ($1, $2, $3, $4)',
                    [transactionId, menuItemId, rid, quantity]
                );
            }
        }
        // Commit transaction
        await pool.query('COMMIT');
        res.sendStatus(201); // Successfully created
    } catch (err) {
        console.error("Error in Adding Transaction: " + err.message);
        await pool.query('ROLLBACK');  // Rollback if error occurs
        res.status(500).json({ error: err.message }); // Send error message in response
    }
});


app.post('/commitTransaction', async (req, res) => {
    const { cid, ba, rid, cost, itemDict, paymentMethod, stockDict, balance } = req.body;

    // Check for missing required fields
    if (!cid || !ba || !rid || !cost || !itemDict || !paymentMethod || !stockDict || !balance) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the current date and time
    let currentDate = new Date();
    // Format the date in YYYY-MM-DD HH:MM:SS format
    let formattedDate = currentDate.toISOString().slice(0, 19).replace("T", " ");

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Begin transaction

        // Insert the main transaction record
        const transactionResult = await client.query(
            'INSERT INTO transaction(cost, date, customer_id, payment_method, location_id) VALUES ($1, $2, $3, $4, $5) RETURNING tid',
            [cost, formattedDate, cid, paymentMethod, rid]
        );
        const transactionId = transactionResult.rows[0].tid;

        // Insert items into order_data
        for (const [menuItemId, quantity] of Object.entries(itemDict)) {
            if (quantity > 0) {
                await client.query(
                    'INSERT INTO order_data(transaction_id, menu_item, restaurant_id, quantity) VALUES ($1, $2, $3, $4)',
                    [transactionId, menuItemId, rid, quantity]
                );
            }
        }

        // Update stock levels
        for (const [menuItemId, quantity] of Object.entries(itemDict)) {
            if (quantity > 0) {
                let newStock = stockDict[menuItemId] - quantity;
                if (newStock >= 0) {
                    await client.query(
                        'UPDATE stock SET stock = $1 WHERE item_id = $2 and restaurant_id = $3',
                        [newStock, menuItemId, rid]
                    );
                } else {
                    await client.query('ROLLBACK'); // Rollback if stock goes negative
                    return res.status(400).json({
                        error: `Not enough stock for item ${menuItemId}`
                    });
                }
            }
        }

        // Get current bank balance and update it
        const bankResult = await client.query(
            'SELECT account_balance FROM bank WHERE bank_account = $1',
            [ba]
        );

        if (bankResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Bank account not found' });
        }

        let newBalance = (parseFloat(bankResult.rows[0].account_balance) - cost).toFixed(2);
        await client.query(
            'UPDATE bank SET account_balance = $1 WHERE bank_account = $2',
            [newBalance, ba]
        );

        // Commit the transaction if everything is successful
        await client.query('COMMIT');
        res.status(201).json({ message: 'Transaction successfully committed.' });

    } catch (err) {
        console.error("Error in Adding Transaction: " + err.message);
        await client.query('ROLLBACK'); // Rollback if error occurs
        res.status(500).json({ error: err.message });
    } finally {
        client.release(); // Release the client back to the pool
    }
});


app.post('/customer', async (req, res) => {
    const { name, email, number, membership, bankAccount, card, expiration, pin, balance } = req.body;
    if (!name || !email || !number || !membership || !bankAccount || !card || !expiration || !pin || !balance) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        // Begin transaction
        await pool.query('BEGIN');

        // Insert into the bank table first to create the bank account
        await pool.query(
            'INSERT INTO bank (bank_account, card_number, card_expiration, card_pin, account_balance) VALUES ($1, $2, $3, $4, $5)',
            [bankAccount, card, expiration, pin, balance]
        );

        // Insert into customer table and use the same bank account (bank_account already exists)
        await pool.query(
            'INSERT INTO customer (name, email, phone_number, membership, bank_account) VALUES ($1, $2, $3, $4, $5)',
            [name, email, number, membership, bankAccount]
        );

        // Commit transaction
        await pool.query('COMMIT');
        res.sendStatus(201); // Successfully created
    } catch (err) {
        console.error("Error in Adding Customer Data " + err.message);
        await pool.query('ROLLBACK');  // Rollback if error occurs
        res.sendStatus(500);
    }
});

app.post('/restaurant', async (req, res) => {
    const { restaurantLocation, restaurantName, restaurantRating } = req.body;
    if (!restaurantLocation || !restaurantName || !restaurantRating) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        // Begin transaction
        await pool.query('BEGIN');

        // Insert into the restaurant table
        await pool.query(
            'INSERT INTO restaurant(location, name, rating) VALUES ($1, $2, $3)',
            [restaurantLocation, restaurantName, restaurantRating]
        );
        // Commit transaction
        await pool.query('COMMIT');
        res.sendStatus(201); // Successfully created
    } catch (err) {
        console.error("Error in Adding Restaurant " + err.message);
        await pool.query('ROLLBACK');  // Rollback if error occurs
        res.sendStatus(500);
    }
});


// Delete a student by ID
app.delete('/restaurant/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('BEGIN');
        await pool.query('DELETE FROM restaurant WHERE rid = $1', [id]);
        await pool.query('COMMIT');
        res.sendStatus(200);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("Error in Deleting Restaurant Data " + err.message);
        res.sendStatus(500);
    }
});

app.post('/createTables', async (req, res) => {
    const sql = `
        DROP TABLE IF EXISTS bank, restaurant, menu, customer, transaction, order_data, employees, stock CASCADE;

        -- Table: bank
        CREATE TABLE bank (
            bank_account BIGINT PRIMARY KEY,
            card_number VARCHAR(16) UNIQUE NOT NULL,
            card_expiration DATE NOT NULL,
            card_pin CHAR(4) NOT NULL,
            account_balance DECIMAL(15, 2) CHECK (account_balance >= 0)
        );

        -- Table: restaurant
        CREATE TABLE restaurant (
            rid SERIAL PRIMARY KEY,
            location VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            rating DECIMAL(2, 1) CHECK (rating BETWEEN 0 AND 5)
        );

        -- Table: menu
        CREATE TABLE menu (
            item_id SERIAL PRIMARY KEY,
            item_name VARCHAR(100) NOT NULL,
            description TEXT,
            cost DECIMAL(5, 2) NOT NULL,
            member_cost DECIMAL(5, 2) CHECK (member_cost < cost) NOT NULL
        );

        -- Table: customer
        CREATE TABLE customer (
            cid SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone_number VARCHAR(15) UNIQUE NOT NULL,
            membership BOOLEAN DEFAULT FALSE,
            bank_account BIGINT REFERENCES bank(bank_account)
        );

        -- Table: transaction
        CREATE TABLE transaction (
            tid SERIAL PRIMARY KEY,
            cost DECIMAL(7, 2) NOT NULL,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            customer_id INT REFERENCES customer(cid),
            payment_method VARCHAR(10) CHECK (payment_method IN ('card', 'cash')) NOT NULL,
            location_id INT REFERENCES restaurant(rid)
        );

        -- Table: order_data
        CREATE TABLE order_data (
            transaction_id INT,
            menu_item INT,
            restaurant_id INT,
            quantity INT,
            PRIMARY KEY (transaction_id, menu_item, restaurant_id),
            FOREIGN KEY (transaction_id) REFERENCES transaction(tid),
            FOREIGN KEY (menu_item) REFERENCES menu(item_id),
            FOREIGN KEY (restaurant_id) REFERENCES restaurant(rid)
        );

        -- Table: employees
        CREATE TABLE employees (
            employee_id SERIAL,
            restaurant_id INT,
            name VARCHAR(100) NOT NULL,
            role VARCHAR(50),
            salary DECIMAL(10, 2),
            PRIMARY KEY (employee_id, restaurant_id),
            FOREIGN KEY (restaurant_id) REFERENCES restaurant(rid)
        );

        CREATE TABLE stock (
            Item_id INT,
            Restaurant_id INT,
            Stock BIGINT,
            PRIMARY KEY (Item_id, Restaurant_id),
            FOREIGN KEY (Item_id) REFERENCES menu(item_id),
            FOREIGN KEY (Restaurant_id) REFERENCES restaurant(rid)
        );

    `;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        res.status(201).json({ message: 'Tables created successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error creating tables:", err.message);
        res.status(500).json({ error: 'Failed to create tables.' });
    } finally {
        client.release();
    }
});

app.post('/populateTables', async (req, res) => {
    const sql = `
        
    INSERT INTO bank (bank_account, card_number, card_expiration, card_pin, account_balance) VALUES
    ('1234567890123456', '4000123412341234', '2026-06-30', '1234', 1500.75),
    ('2345678901234567', '4000567890123456', '2025-11-20', '5678', 20.50),
    ('3456789012345678', '4000987612345678', '2024-12-15', '4321', 3750.00),
    ('4567890123456789', '4000765412348765', '2027-01-10', '8765', 500.25),
    ('5678901234567890', '4000234543218765', '2026-08-31', '3412', 102000.10),
    ('6789012345678901', '4000543287654321', '2024-03-25', '1290', 750.80),
    ('7890123456789012', '4000654321876543', '2025-09-14', '9834', 1345.60),
    ('8901234567890123', '4000786543210987', '2026-05-29', '2945', 25.00),
    ('9012345678901234', '4000876543298765', '2024-11-17', '6743', 4800.50),
    ('0123456789012345', '4000120987654321', '2027-10-30', '9087', 950.30),
    ('1234567898765432', '4000567891230987', '2026-10-10', '2345', 2500.50),
    ('2345678909876543', '4000432167894321', '2027-08-15', '3456', 1800.75),
    ('3456789012987654', '4000321897654321', '2028-02-20', '4567', 3200.00),
    ('4567890123987655', '4000789004321987', '2029-09-01', '5678', 410.25),
    ('5678901234987656', '4000456789012345', '2025-06-15', '6789', 3600.75),
    ('6789012345987657', '4000123456781234', '2027-03-22', '7890', 4700.00),
    ('7890123456987658', '4000789012346543', '2028-11-18', '8901', 50.50),
    ('8901234567987659', '4000678901234567', '2026-07-31', '9012', 5200.25),
    ('9012345678987660', '4000987654321234', '2025-05-25', '0123', 170.75),
    ('0123456789987661', '4000555890123456', '2029-03-11', '1234', 3100.00),
    ('1123456789987662', '4000543298765678', '2027-12-10', '2345', 2900.50),
    ('2234567890987663', '4000345678901234', '2026-01-01', '3456', 441.75),
    ('3345678901987664', '4000123456789876', '2028-06-20', '4567', 330.00),
    ('4456789012987665', '4000789001236543', '2029-09-30', '5678', 1.25),
    ('5567890123987666', '4000678909871234', '2025-02-18', '6789', 2.30);



    INSERT INTO restaurant (location, name, rating) VALUES
    ('123 Main St, New York, NY', 'McDonalds Times Square', 4.5),
    ('456 Elm St, Los Angeles, CA', 'McDonalds Hollywood', 4.2),
    ('789 Oak St, Chicago, IL', 'McDonalds Magnificent Mile', 4.3),
    ('101 Maple Ave, Miami, FL', 'McDonalds Miami Beach', 4.0),
    ('202 Pine St, Houston, TX', 'McDonalds Downtown Houston', 3.9),
    ('303 Cedar St, Atlanta, GA', 'McDonalds Peachtree', 4.1),
    ('404 Birch St, Seattle, WA', 'McDonalds Pike Place', 4.4),
    ('505 Spruce St, Boston, MA', 'McDonalds Downtown Boston', 4.3),
    ('606 Redwood St, San Francisco, CA', 'McDonalds Fishermans Wharf', 4.6),
    ('707 Aspen St, Las Vegas, NV', 'McDonalds Las Vegas Strip', 4.2);

    INSERT INTO menu (item_name, description, cost, member_cost) VALUES
    ('Big Mac', 'Two all-beef patties, special sauce, lettuce, cheese, pickles, onions on a sesame seed bun', 5.99, 5.49),
    ('Quarter Pounder with Cheese', 'Quarter-pound beef patty with cheese, onions, pickles, ketchup, and mustard', 6.29, 5.79),
    ('McChicken', 'Crispy chicken sandwich with lettuce and mayonnaise on a toasted bun', 3.69, 3.29),
    ('Filet-O-Fish', 'Fish filet with tartar sauce and cheese on a steamed bun', 4.79, 4.29),
    ('McDouble', 'Two beef patties with cheese, pickles, onions, ketchup, and mustard', 2.99, 2.79),
    ('Cheeseburger', 'Beef patty with cheese, pickles, onions, ketchup, and mustard', 1.99, 1.79),
    ('French Fries (Medium)', 'Golden, crispy French fries', 2.89, 2.59),
    ('Chicken McNuggets (10 pcs)', 'Crispy chicken nuggets with your choice of dipping sauce', 4.49, 4.19),
    ('Spicy McChicken', 'Spicy crispy chicken sandwich with lettuce and mayonnaise on a toasted bun', 3.99, 3.69),
    ('Egg McMuffin', 'Egg, Canadian bacon, and cheese on an English muffin', 3.99, 3.59),
    ('Hash Browns', 'Crispy hash brown patty', 1.59, 1.39),
    ('Apple Pie', 'Warm apple pie with a crispy outer crust', 1.29, 1.19),
    ('McFlurry with M&M’s', 'Vanilla soft serve with M&M’s candy', 3.29, 2.99),
    ('Iced Coffee (Medium)', 'Cold and refreshing coffee over ice', 2.19, 1.99),
    ('Sweet Tea (Large)', 'Sweetened iced tea', 1.39, 1.19);



    INSERT INTO customer (name, email, phone_number, membership, bank_account) VALUES
    ('John Doe', 'johndoe@example.com', '5551234567', TRUE, '1234567890123456'),
    ('Jane Smith', 'janesmith@example.com', '5555678901', FALSE, '2345678901234567'),
    ('Alice Johnson', 'alicej@example.com', '5559012345', TRUE, '3456789012345678'),
    ('Bob Brown', 'bobb@example.com', '5553456789', FALSE, '4567890123456789'),
    ('Charlie Davis', 'charlied@example.com', '5557890123', TRUE, '5678901234567890'),
    ('Dana White', 'danaw@example.com', '5552345678', FALSE, '6789012345678901'),
    ('Eva Green', 'evag@example.com', '5556789012', TRUE, '7890123456789012'),
    ('Frank Black', 'frankb@example.com', '5551234568', FALSE, '8901234567890123'),
    ('Grace Lee', 'gracel@example.com', '5555678902', TRUE, '9012345678901234'),
    ('Henry King', 'henryk@example.com', '5559012346', FALSE, '0123456789012345'),
    ('Isla Martinez', 'islam@example.com', '5554321098', TRUE, '1234567898765432'),
    ('Jack Wilson', 'jackw@example.com', '5558901234', FALSE, '2345678909876543'),
    ('Karen Scott', 'karens@example.com', '5556789013', TRUE, '3456789012987654'),
    ('Leo Harris', 'leoh@example.com', '5557890124', FALSE, '4567890123987655'),
    ('Mia Young', 'miay@example.com', '5551234579', TRUE, '5678901234987656'),
    ('Noah Carter', 'noahc@example.com', '5555678910', FALSE, '6789012345987657'),
    ('Olivia Adams', 'oliviaa@example.com', '5559012347', TRUE, '7890123456987658'),
    ('Paul Walker', 'paulw@example.com', '5553456780', FALSE, '8901234567987659'),
    ('Quinn Foster', 'quinnf@example.com', '5557890125', TRUE, '9012345678987660'),
    ('Ruby Bennett', 'rubyb@example.com', '5552345679', FALSE, '0123456789987661'),
    ('Sam Collins', 'samc@example.com', '5556789021', TRUE, '1123456789987662'),
    ('Tina Evans', 'tinae@example.com', '5551234590', FALSE, '2234567890987663'),
    ('Uma Brooks', 'umab@example.com', '5555678911', TRUE, '3345678901987664'),
    ('Victor Stone', 'victors@example.com', '5559012348', FALSE, '4456789012987665'),
    ('Wendy Cruz', 'wendyc@example.com', '5553456781', TRUE, '5567890123987666');

    INSERT INTO transaction (cost, date, customer_id, payment_method, location_id) VALUES (5.99, '2024-11-06 12:30:00', 1, 'card', 1), (6.29, '2024-11-06 12:35:00', 2, 'cash', 2), (3.69, '2024-11-06 12:40:00', 3, 'card', 3), (4.79, '2024-11-06 12:45:00', 4, 'cash', 4), (2.99, '2024-11-06 12:50:00', 5, 'card', 5), (1.99, '2024-11-06 12:55:00', 6, 'cash', 6), (4.49, '2024-11-06 13:00:00', 7, 'card', 7), (3.99, '2024-11-06 13:05:00', 8, 'cash', 8), (2.89, '2024-11-06 13:10:00', 9, 'card', 9), (1.29, '2024-11-06 13:15:00', 10, 'cash', 10);

    INSERT INTO order_data (transaction_id, menu_item, restaurant_id, quantity) VALUES
    (1, 1, 1, 2), (1, 2, 1, 1),(2, 3, 2, 3),(3, 7, 3, 4),(4, 5, 1, 1); 

    INSERT INTO employees (restaurant_id, name, role, salary) VALUES
    -- Restaurant 1
    (1, 'John Smith', 'Manager', 55000.00),
    (1, 'Jane Doe', 'Manager', 56000.00),
    (1, 'Michael Brown', 'Cook', 32000.00),
    (1, 'Sophia White', 'Cook', 33000.00),
    (1, 'Emily Davis', 'Cashier', 30000.00),
    (1, 'Olivia Green', 'Cashier', 31000.00),
    (1, 'Chris Black', 'Server', 28000.00),
    (1, 'David Blue', 'Server', 29000.00),
    (2, 'Sarah Wilson', 'Manager', 57000.00),
    (2, 'James Clark', 'Manager', 58000.00),
    (2, 'Anna Brown', 'Cook', 34000.00),
    (2, 'Ethan White', 'Cook', 35000.00),
    (2, 'Sophia Martinez', 'Cashier', 32000.00),
    (2, 'Liam Gray', 'Cashier', 33000.00),
    (2, 'Isabella Black', 'Server', 29000.00),
    (2, 'Mason Blue', 'Server', 30000.00),
    (3, 'David Lee', 'Manager', 59000.00),
    (3, 'Emma Adams', 'Manager', 60000.00),
    (3, 'Noah Brown', 'Cook', 36000.00),
    (3, 'Ava White', 'Cook', 37000.00),
    (3, 'Olivia Harris', 'Cashier', 34000.00),
    (3, 'Lucas Green', 'Cashier', 35000.00),
    (3, 'Mia Black', 'Server', 31000.00),
    (3, 'Ethan Blue', 'Server', 32000.00),
    (4, 'Liam Johnson', 'Manager', 58000.00),
    (4, 'Sophia Taylor', 'Manager', 59000.00),
    (4, 'William Brown', 'Cook', 35000.00),
    (4, 'Isabella White', 'Cook', 36000.00),
    (4, 'Emily Thomas', 'Cashier', 32000.00),
    (4, 'Lucas Garcia', 'Cashier', 33000.00),
    (4, 'Charlotte Walker', 'Server', 30000.00),
    (4, 'Elijah Hall', 'Server', 31000.00),
    (5, 'Oliver Martinez', 'Manager', 60000.00),
    (5, 'Ava Robinson', 'Manager', 61000.00),
    (5, 'Mason King', 'Cook', 37000.00),
    (5, 'Sophia Wright', 'Cook', 38000.00),
    (5, 'Liam Young', 'Cashier', 35000.00),
    (5, 'Emma Hill', 'Cashier', 36000.00),
    (5, 'Charlotte Scott', 'Server', 33000.00),
    (5, 'Oliver Adams', 'Server', 34000.00),
    (6, 'Elijah Carter', 'Manager', 62000.00),
    (6, 'Mia Lopez', 'Manager', 63000.00),
    (6, 'James Perez', 'Cook', 39000.00),
    (6, 'Charlotte Taylor', 'Cook', 40000.00),
    (6, 'Benjamin Harris', 'Cashier', 37000.00),
    (6, 'Sophia Nelson', 'Cashier', 38000.00),
    (6, 'Amelia Allen', 'Server', 35000.00),
    (6, 'Liam Wright', 'Server', 36000.00),
    (7, 'Mason Wilson', 'Manager', 64000.00),
    (7, 'Ava Clark', 'Manager', 65000.00),
    (7, 'Lucas Walker', 'Cook', 41000.00),
    (7, 'Isabella Young', 'Cook', 42000.00),
    (7, 'James King', 'Cashier', 39000.00),
    (7, 'Emily Moore', 'Cashier', 40000.00),
    (7, 'Amelia Hill', 'Server', 37000.00),
    (7, 'Noah Taylor', 'Server', 38000.00),
    (8, 'Oliver Anderson', 'Manager', 66000.00),
    (8, 'Mia Allen', 'Manager', 67000.00),
    (8, 'Benjamin Johnson', 'Cook', 43000.00),
    (8, 'Sophia Carter', 'Cook', 44000.00),
    (8, 'Ava Nelson', 'Cashier', 41000.00),
    (8, 'Elijah Hill', 'Cashier', 42000.00),
    (8, 'Charlotte Robinson', 'Server', 39000.00),
    (8, 'Lucas Hall', 'Server', 40000.00),
    (9, 'William Garcia', 'Manager', 68000.00),
    (9, 'Emma Scott', 'Manager', 69000.00),
    (9, 'Liam Adams', 'Cook', 45000.00),
    (9, 'Amelia Wright', 'Cook', 46000.00),
    (9, 'Emily Taylor', 'Cashier', 43000.00),
    (9, 'Mason Brown', 'Cashier', 44000.00),
    (9, 'Ava Johnson', 'Server', 41000.00),
    (9, 'James White', 'Server', 42000.00),
    (10, 'Noah Davis', 'Manager', 70000.00),
    (10, 'Sophia Martinez', 'Manager', 71000.00),
    (10, 'Lucas Green', 'Cook', 47000.00),
    (10, 'Olivia Lopez', 'Cook', 48000.00),
    (10, 'Emma Hall', 'Cashier', 45000.00),
    (10, 'Elijah Adams', 'Cashier', 46000.00),
    (10, 'Benjamin Scott', 'Server', 43000.00),
    (10, 'Mason Carter', 'Server', 44000.00);

    INSERT INTO stock (Item_id, Restaurant_id, Stock) VALUES
    (1, 1, 10), (1, 2, 10), (1, 3, 10), (1, 4, 10), (1, 5, 10), (1, 6, 10), (1, 7, 10), (1, 8, 10), (1, 9, 10), (1, 10, 10),
    (2, 1, 1), (2, 2, 1), (2, 3, 1), (2, 4, 1), (2, 5, 1), (2, 6, 1), (2, 7, 1), (2, 8, 1), (2, 9, 1), (2, 10, 1),
    (3, 1, 100), (3, 2, 100), (3, 3, 100), (3, 4, 100), (3, 5, 100), (3, 6, 100), (3, 7, 100), (3, 8, 100), (3, 9, 100), (3, 10, 100),
    (4, 1, 100), (4, 2, 100), (4, 3, 100), (4, 4, 100), (4, 5, 100), (4, 6, 100), (4, 7, 100), (4, 8, 100), (4, 9, 100), (4, 10, 100),
    (5, 1, 100), (5, 2, 100), (5, 3, 100), (5, 4, 100), (5, 5, 100), (5, 6, 100), (5, 7, 100), (5, 8, 100), (5, 9, 100), (5, 10, 100),
    (6, 1, 100), (6, 2, 100), (6, 3, 100), (6, 4, 100), (6, 5, 100), (6, 6, 100), (6, 7, 100), (6, 8, 100), (6, 9, 100), (6, 10, 100),
    (7, 1, 100), (7, 2, 100), (7, 3, 100), (7, 4, 100), (7, 5, 100), (7, 6, 100), (7, 7, 100), (7, 8, 100), (7, 9, 100), (7, 10, 100),
    (8, 1, 100), (8, 2, 100), (8, 3, 100), (8, 4, 100), (8, 5, 100), (8, 6, 100), (8, 7, 100), (8, 8, 100), (8, 9, 100), (8, 10, 100),
    (9, 1, 100), (9, 2, 100), (9, 3, 100), (9, 4, 100), (9, 5, 100), (9, 6, 100), (9, 7, 100), (9, 8, 100), (9, 9, 100), (9, 10, 100),
    (10, 1, 100), (10, 2, 100), (10, 3, 100), (10, 4, 100), (10, 5, 100), (10, 6, 100), (10, 7, 100), (10, 8, 100), (10, 9, 100), (10, 10, 100),
    (11, 1, 100), (11, 2, 100), (11, 3, 100), (11, 4, 100), (11, 5, 100), (11, 6, 100), (11, 7, 100), (11, 8, 100), (11, 9, 100), (11, 10, 100),
    (12, 1, 100), (12, 2, 100), (12, 3, 100), (12, 4, 100), (12, 5, 100), (12, 6, 100), (12, 7, 100), (12, 8, 100), (12, 9, 100), (12, 10, 100),
    (13, 1, 100), (13, 2, 100), (13, 3, 100), (13, 4, 100), (13, 5, 100), (13, 6, 100), (13, 7, 100), (13, 8, 100), (13, 9, 100), (13, 10, 100),
    (14, 1, 100), (14, 2, 100), (14, 3, 100), (14, 4, 100), (14, 5, 100), (14, 6, 100), (14, 7, 100), (14, 8, 100), (14, 9, 100), (14, 10, 100),
    (15, 1, 100), (15, 2, 100), (15, 3, 100), (15, 4, 100), (15, 5, 100), (15, 6, 100), (15, 7, 100), (15, 8, 100), (15, 9, 100), (15, 10, 100);


    `;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        res.status(201).json({ message: 'Tables created successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error creating tables:", err.message);
        res.status(500).json({ error: 'Failed to create tables.' });
    } finally {
        client.release();
    }
});


app.post('/commitTransactionLock', async (req, res) => {
    const { cid, ba, rid, cost, itemDict, paymentMethod} = req.body;

    if (!cid || !ba || !rid || !cost || !itemDict || !paymentMethod) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace("T", " ");

    const client = await pool.connect();

    try {
        // Begin a transaction with SERIALIZABLE isolation level
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

        // Insert the main transaction record
        const transactionResult = await client.query(
            'INSERT INTO transaction(cost, date, customer_id, payment_method, location_id) VALUES ($1, $2, $3, $4, $5) RETURNING tid',
            [cost, formattedDate, cid, paymentMethod, rid]
        );
        const transactionId = transactionResult.rows[0].tid;

        // Update stock levels and insert order data atomically
        for (const [menuItemId, quantity] of Object.entries(itemDict)) {
            if (quantity > 0) {
                // Lock the stock row for this item
                const stockResult = await client.query(
                    'SELECT stock FROM stock WHERE item_id = $1 AND restaurant_id = $2 FOR UPDATE',
                    [menuItemId, rid]
                );

                if (stockResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: `Item ${menuItemId} not found in stock.` });
                }

                const currentStock = stockResult.rows[0].stock;
                const newStock = currentStock - quantity;

                if (newStock < 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: `Not enough stock for item ${menuItemId}.` });
                }

                // Update stock
                await client.query(
                    'UPDATE stock SET stock = $1 WHERE item_id = $2 AND restaurant_id = $3',
                    [newStock, menuItemId, rid]
                );

                // Insert into order_data
                await client.query(
                    'INSERT INTO order_data(transaction_id, menu_item, restaurant_id, quantity) VALUES ($1, $2, $3, $4)',
                    [transactionId, menuItemId, rid, quantity]
                );
            }
        }

        // Lock and update the bank account
        const bankResult = await client.query(
            'SELECT account_balance FROM bank WHERE bank_account = $1 FOR UPDATE',
            [ba]
        );

        if (bankResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Bank account not found.' });
        }

        const currentBalance = parseFloat(bankResult.rows[0].account_balance);
        const newBalance = currentBalance - cost;

        if (newBalance < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient funds in bank account.' });
        }

        // Update the bank balance
        await client.query(
            'UPDATE bank SET account_balance = $1 WHERE bank_account = $2',
            [newBalance.toFixed(2), ba]
        );

        // Commit the transaction
        await client.query('COMMIT');
        res.status(201).json({ message: 'Transaction successfully committed.' });

    } catch (err) {
        console.error('Error in Adding Transaction:', err.message);
        await client.query('ROLLBACK'); // Rollback if any error occurs
        res.status(500).json({ error: 'Transaction failed. ' + err.message });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

app.get('/top', async (req, res) => {
    try {
        const result = await pool.query(`
            WITH RankedSales AS (
                SELECT 
                    r.name AS restaurant_name,
                    m.item_name AS product_name,
                    SUM(o.quantity) AS total_quantity_sold,
                    ROW_NUMBER() OVER (PARTITION BY r.rid ORDER BY SUM(o.quantity) DESC) AS rank
                FROM 
                    order_data o
                JOIN 
                    menu m ON o.menu_item = m.item_id
                JOIN 
                    restaurant r ON o.restaurant_id = r.rid
                GROUP BY 
                    r.rid, r.name, m.item_name
            )
            SELECT 
                restaurant_name,
                product_name AS best_selling_product,
                total_quantity_sold
            FROM 
                RankedSales
            WHERE 
                rank = 1;
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data: " + err.message);
        res.sendStatus(500);
    }
});

app.get('/least', async (req, res) => {
    try {
        const result = await pool.query(`
            WITH RankedSales AS (
                SELECT 
                    r.name AS restaurant_name,
                    m.item_name AS product_name,
                    COALESCE(SUM(o.quantity), 0) AS total_quantity_sold,
                    ROW_NUMBER() OVER (PARTITION BY r.rid ORDER BY SUM(o.quantity) ASC NULLS FIRST) AS rank
                FROM 
                    restaurant r
                LEFT JOIN 
                    order_data o ON r.rid = o.restaurant_id
                LEFT JOIN 
                    menu m ON o.menu_item = m.item_id
                GROUP BY 
                    r.rid, r.name, m.item_name
            )
            SELECT 
                restaurant_name,
                product_name AS least_selling_product,
                total_quantity_sold
            FROM 
                RankedSales
            WHERE 
                rank = 1;
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data: " + err.message);
        res.sendStatus(500);
    }
});

app.get('/top-customers', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.name AS customer_name,
                c.email AS customer_email,
                COUNT(t.tid) AS total_orders
            FROM 
                customer c
            JOIN 
                transaction t ON c.cid = t.customer_id
            GROUP BY 
                c.cid, c.name, c.email
            ORDER BY 
                total_orders DESC
            LIMIT 5;
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data: " + err.message);
        res.sendStatus(500);
    }
});

app.get('/top-branches', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.name AS branch_name,
                r.location AS branch_location,
                SUM(o.quantity) AS total_quantity_sold
            FROM 
                restaurant r
            JOIN 
                order_data o ON r.rid = o.restaurant_id
            GROUP BY 
                r.rid, r.name, r.location
            ORDER BY 
                total_quantity_sold DESC
            LIMIT 5;
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data: " + err.message);
        res.sendStatus(500);
    }
});

app.get('/top-branches-orders', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.name AS branch_name,
                r.location AS branch_location,
                COUNT(DISTINCT o.transaction_id) AS total_orders
            FROM 
                restaurant r
            JOIN 
                order_data o ON r.rid = o.restaurant_id
            GROUP BY 
                r.rid, r.name, r.location
            ORDER BY 
                total_orders DESC
            LIMIT 5;
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data: " + err.message);
        res.sendStatus(500);
    }
});

app.get('/profit', async (req, res) => {
    try {
        const result = await pool.query(`
            WITH RestaurantCOGS AS (
                SELECT
                    r.rid AS restaurant_id,
                    r.name AS restaurant_name,
                    r.location AS branch_location,
                    SUM(m.cost * o.quantity) AS total_cogs
                FROM
                    restaurant r
                JOIN
                    order_data o ON r.rid = o.restaurant_id
                JOIN
                    menu m ON o.menu_item = m.item_id
                GROUP BY
                    r.rid, r.name, r.location
            ),
            RankedCOGS AS (
                SELECT
                    *,
                    RANK() OVER (ORDER BY total_cogs DESC) AS rank
                FROM
                    RestaurantCOGS
            )
            SELECT
                restaurant_id,
                restaurant_name,
                branch_location,
                total_cogs,
                rank
            FROM
                RankedCOGS
            ORDER BY
                rank, restaurant_id;
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Fetching Data: " + err.message);
        res.sendStatus(500);
    }
});


// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
