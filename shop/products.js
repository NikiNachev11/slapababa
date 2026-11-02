// Product catalog for the Slapababa demo shop.
// Each product: id, name, category, price (EUR), oldPrice (optional, for sales),
// rating (0-5), reviews (count), stock, emoji (the "picture"), colors (gradient), tags, description.

const CATEGORIES = [
  { id: "electronics", name: "Electronics", emoji: "💻", colors: ["#4f46e5", "#06b6d4"] },
  { id: "fashion", name: "Fashion", emoji: "👕", colors: ["#db2777", "#f59e0b"] },
  { id: "home", name: "Home & Kitchen", emoji: "🏠", colors: ["#059669", "#a3e635"] },
  { id: "sports", name: "Sports & Outdoors", emoji: "⚽", colors: ["#ea580c", "#facc15"] },
  { id: "toys", name: "Toys & Games", emoji: "🧸", colors: ["#9333ea", "#f472b6"] },
  { id: "books", name: "Books", emoji: "📚", colors: ["#7c2d12", "#f97316"] },
  { id: "beauty", name: "Beauty & Health", emoji: "💄", colors: ["#be123c", "#fda4af"] },
  { id: "food", name: "Food & Drinks", emoji: "🍫", colors: ["#854d0e", "#fbbf24"] },
  { id: "garden", name: "Garden & Pets", emoji: "🌻", colors: ["#15803d", "#86efac"] },
  { id: "auto", name: "Car Accessories", emoji: "🚗", colors: ["#1e3a8a", "#60a5fa"] },
];

// [name, category, price, oldPrice|null, rating, reviews, stock, emoji, tags, description]
const RAW_PRODUCTS = [
  // Electronics
  ["Nova X Smartphone 128GB", "electronics", 499, 599, 4.6, 1284, 25, "📱", ["phone", "android", "5g"], "A fast 5G phone with a 6.5\" OLED screen, triple camera and a battery that lasts all day."],
  ["AirBeat Wireless Earbuds", "electronics", 79, 99, 4.4, 2310, 60, "🎧", ["audio", "bluetooth"], "Noise-cancelling earbuds with 30 hours of total playtime and a pocket-sized charging case."],
  ["ProBook 15 Laptop", "electronics", 1099, null, 4.7, 642, 12, "💻", ["laptop", "work"], "15-inch laptop with 16GB RAM, 512GB SSD and a backlit keyboard. Great for school and gaming."],
  ["PixelView 27\" Monitor", "electronics", 229, 279, 4.5, 418, 18, "🖥️", ["monitor", "4k"], "27-inch 4K monitor with thin bezels and a stand you can tilt and rotate."],
  ["SnapShot Mirrorless Camera", "electronics", 749, null, 4.8, 211, 7, "📷", ["camera", "photo"], "24MP mirrorless camera with 4K video, flip screen and a kit lens included."],
  ["TickTock Smartwatch", "electronics", 159, 199, 4.3, 975, 40, "⌚", ["watch", "fitness"], "Track steps, sleep and heart rate. Water resistant with a 7-day battery."],
  ["GameBox Controller", "electronics", 49, null, 4.6, 1530, 75, "🎮", ["gaming", "controller"], "Wireless controller with vibration, works with PC and phones."],
  ["BoomBox Bluetooth Speaker", "electronics", 59, 79, 4.5, 860, 33, "🔊", ["audio", "speaker"], "Loud, waterproof speaker that floats. 12 hours of music."],
  ["PowerUp 20000mAh Power Bank", "electronics", 35, null, 4.4, 1102, 90, "🔋", ["charger", "travel"], "Charge your phone up to 5 times. Two USB-C ports and fast charging."],
  ["TabletOne 10\"", "electronics", 289, 329, 4.2, 377, 15, "📲", ["tablet"], "10-inch tablet for videos, drawing and homework. Comes with a stylus."],
  ["DroneFly Mini", "electronics", 199, null, 4.1, 156, 9, "🚁", ["drone", "camera"], "Small drone with a HD camera and 20 minute flight time. Easy for beginners."],
  ["KeyClick Mechanical Keyboard", "electronics", 89, 109, 4.7, 689, 28, "⌨️", ["keyboard", "gaming", "rgb"], "Clicky RGB mechanical keyboard with keys that light up in any colour."],

  // Fashion
  ["Classic Cotton T-Shirt", "fashion", 15, null, 4.3, 2045, 200, "👕", ["shirt", "cotton"], "Soft 100% cotton t-shirt. Available in many colours."],
  ["Slim Fit Jeans", "fashion", 45, 59, 4.4, 1320, 80, "👖", ["jeans", "denim"], "Stretchy blue jeans with a modern slim fit."],
  ["Runner Sneakers", "fashion", 69, 89, 4.6, 1789, 55, "👟", ["shoes", "sport"], "Light and comfy sneakers for every day."],
  ["Winter Puffer Jacket", "fashion", 119, 159, 4.7, 540, 22, "🧥", ["jacket", "winter"], "Warm puffer jacket with a hood. Keeps you cosy down to -15°C."],
  ["Summer Dress", "fashion", 39, null, 4.5, 610, 34, "👗", ["dress", "summer"], "Light flowy dress with a flower print."],
  ["Baseball Cap", "fashion", 19, null, 4.2, 432, 120, "🧢", ["hat", "cap"], "Adjustable cap that goes with everything."],
  ["Leather Backpack", "fashion", 79, 99, 4.6, 388, 26, "🎒", ["bag", "school"], "Stylish backpack with a laptop pocket."],
  ["Aviator Sunglasses", "fashion", 29, 39, 4.3, 702, 70, "🕶️", ["glasses", "summer"], "UV400 protection with a classic look."],
  ["Wool Scarf", "fashion", 25, null, 4.4, 215, 45, "🧣", ["scarf", "winter"], "Soft wool scarf in a checked pattern."],
  ["High Heels", "fashion", 59, null, 4.0, 198, 19, "👠", ["shoes", "party"], "Elegant heels for special nights."],

  // Home & Kitchen
  ["Espresso Coffee Machine", "home", 189, 239, 4.7, 934, 14, "☕", ["coffee", "kitchen"], "Make barista-style espresso and cappuccino at home."],
  ["Non-Stick Frying Pan 28cm", "home", 29, null, 4.5, 1675, 85, "🍳", ["cooking", "pan"], "Nothing sticks! Works on all stoves including induction."],
  ["Robot Vacuum Cleaner", "home", 249, 329, 4.4, 510, 11, "🧹", ["cleaning", "smart"], "Cleans your floors by itself and goes back to charge."],
  ["Cozy Throw Blanket", "home", 35, null, 4.8, 1220, 64, "🛋️", ["blanket", "living room"], "Super soft fleece blanket for movie nights."],
  ["Scented Candle Set", "home", 22, 28, 4.6, 856, 100, "🕯️", ["candle", "decor"], "Three candles: vanilla, lavender and fresh linen."],
  ["Kitchen Knife Set", "home", 69, null, 4.6, 402, 30, "🔪", ["kitchen", "knives"], "Six sharp stainless steel knives with a wooden block."],
  ["Smart LED Bulb (4 pack)", "home", 39, 49, 4.3, 770, 140, "💡", ["smart", "light"], "Change colours from your phone. Works with voice assistants."],
  ["Wall Clock", "home", 24, null, 4.2, 145, 38, "🕰️", ["decor", "clock"], "Quiet wall clock with a wooden frame."],
  ["Blender Pro 1200W", "home", 79, 99, 4.5, 621, 21, "🥤", ["kitchen", "smoothie"], "Powerful blender for smoothies, soups and ice."],
  ["Bath Towel Set", "home", 32, null, 4.4, 503, 55, "🛁", ["bathroom", "towels"], "Four fluffy cotton towels."],

  // Sports
  ["Pro Football", "sports", 25, null, 4.6, 980, 150, "⚽", ["football", "ball"], "Official size 5 match ball."],
  ["Yoga Mat", "sports", 29, 35, 4.5, 1340, 95, "🧘", ["yoga", "fitness"], "Thick non-slip mat with a carrying strap."],
  ["Adjustable Dumbbells", "sports", 129, 159, 4.7, 455, 16, "🏋️", ["gym", "weights"], "From 2 to 24 kg in one pair. Saves space at home."],
  ["Mountain Bike 27.5\"", "sports", 549, 649, 4.6, 233, 6, "🚲", ["bike", "outdoor"], "21-speed mountain bike with front suspension."],
  ["Camping Tent (4 person)", "sports", 139, null, 4.4, 318, 13, "⛺", ["camping", "outdoor"], "Waterproof tent that sets up in 5 minutes."],
  ["Basketball", "sports", 22, null, 4.5, 601, 80, "🏀", ["basketball", "ball"], "Indoor and outdoor basketball with great grip."],
  ["Tennis Racket", "sports", 59, 75, 4.3, 211, 27, "🎾", ["tennis"], "Light racket for beginners and intermediate players."],
  ["Skateboard", "sports", 65, null, 4.4, 389, 24, "🛹", ["skate", "outdoor"], "Maple wood deck with smooth wheels."],
  ["Swimming Goggles", "sports", 14, null, 4.2, 720, 130, "🥽", ["swim"], "Anti-fog goggles with UV protection."],

  // Toys
  ["Mega Building Blocks (1000 pcs)", "toys", 49, 65, 4.8, 1450, 40, "🧱", ["blocks", "creative"], "Build anything you can imagine. Compatible with major brands."],
  ["Teddy Bear XL", "toys", 35, null, 4.9, 870, 50, "🧸", ["plush", "gift"], "Huge, huggable teddy bear, 80 cm tall."],
  ["RC Race Car", "toys", 45, 59, 4.5, 640, 35, "🏎️", ["rc", "car"], "Remote control car that goes 25 km/h!"],
  ["Puzzle 1000 Pieces", "toys", 18, null, 4.6, 520, 70, "🧩", ["puzzle", "family"], "Beautiful landscape puzzle for long evenings."],
  ["Board Game: Castle Quest", "toys", 39, null, 4.7, 410, 29, "🎲", ["board game", "family"], "Strategy game for 2–5 players. Ages 8+."],
  ["Kite", "toys", 19, null, 4.3, 190, 44, "🪁", ["outdoor"], "Colourful kite that flies even in light wind."],
  ["Toy Robot", "toys", 59, 79, 4.4, 305, 18, "🤖", ["robot", "coding"], "Robot that dances, talks and teaches kids to code."],
  ["Magic Kit", "toys", 25, null, 4.2, 160, 37, "🎩", ["magic", "gift"], "50 magic tricks to amaze your friends."],

  // Books
  ["The Lost Island (Novel)", "books", 14, null, 4.6, 2100, 120, "📕", ["adventure", "novel"], "A thrilling adventure about friends stranded on a mysterious island."],
  ["Learn to Code in 30 Days", "books", 29, 35, 4.7, 890, 60, "📘", ["coding", "learning"], "Beginner-friendly guide to programming with fun projects."],
  ["World Cookbook", "books", 32, null, 4.5, 450, 40, "📗", ["cooking"], "200 recipes from 50 countries."],
  ["Space Encyclopedia", "books", 39, 45, 4.8, 330, 25, "📙", ["science", "space"], "Everything about planets, stars and galaxies with amazing pictures."],
  ["Comic: Super Slap Man", "books", 12, null, 4.4, 760, 90, "🦸", ["comic", "superhero"], "The funniest superhero comic of the year."],
  ["Mystery at Midnight", "books", 16, null, 4.3, 540, 65, "🔍", ["mystery", "novel"], "A detective story you won't be able to put down."],

  // Beauty
  ["Vitamin C Face Serum", "beauty", 24, 32, 4.5, 1160, 75, "🧴", ["skincare"], "Brightening serum for glowing skin."],
  ["Perfume 'Midnight Rose'", "beauty", 59, null, 4.6, 380, 30, "🌹", ["perfume"], "Floral and warm fragrance, 50 ml."],
  ["Lipstick Set", "beauty", 19, null, 4.3, 610, 85, "💄", ["makeup"], "Five long-lasting shades."],
  ["Electric Toothbrush", "beauty", 49, 69, 4.7, 1540, 45, "🪥", ["health", "teeth"], "Removes 10x more plaque. 2 week battery."],
  ["Hair Dryer 2000W", "beauty", 39, null, 4.4, 720, 33, "💨", ["hair"], "Fast drying with ion technology for shiny hair."],
  ["Nail Polish Collection", "beauty", 15, null, 4.2, 290, 110, "💅", ["nails", "makeup"], "Eight trendy colours."],

  // Food
  ["Belgian Chocolate Box", "food", 18, null, 4.9, 1320, 100, "🍫", ["chocolate", "gift"], "24 handmade chocolates with different fillings."],
  ["Organic Coffee Beans 1kg", "food", 22, 26, 4.7, 870, 70, "🫘", ["coffee", "organic"], "Medium roast from Colombia with notes of caramel."],
  ["Green Tea Selection", "food", 12, null, 4.5, 410, 90, "🍵", ["tea"], "Six kinds of green tea, 60 bags."],
  ["Honey Jar 500g", "food", 9, null, 4.8, 520, 120, "🍯", ["honey", "organic"], "Pure Bulgarian mountain honey."],
  ["Snack Party Box", "food", 25, 30, 4.4, 330, 55, "🍿", ["snacks", "party"], "Chips, popcorn, nuts and sweets for a movie night."],
  ["Olive Oil Extra Virgin 1L", "food", 15, null, 4.6, 290, 60, "🫒", ["cooking"], "Cold pressed olive oil from Greece."],

  // Garden & Pets
  ["Dog Bed Large", "garden", 45, 59, 4.7, 760, 30, "🐕", ["dog", "pets"], "Soft orthopedic bed for big dogs."],
  ["Cat Scratching Tower", "garden", 55, null, 4.5, 540, 20, "🐈", ["cat", "pets"], "Three levels of fun with a cozy hideout."],
  ["Garden Tool Set", "garden", 35, null, 4.4, 280, 40, "🧑‍🌾", ["garden", "tools"], "Shovel, rake and pruner with ergonomic handles."],
  ["Flower Seeds Mix", "garden", 6, null, 4.3, 410, 300, "🌻", ["seeds", "flowers"], "Sunflowers, tulips and daisies for a colourful garden."],
  ["Aquarium Starter Kit", "garden", 79, 99, 4.2, 150, 10, "🐠", ["fish", "pets"], "40L tank with filter, light and heater."],
  ["Bird Feeder", "garden", 16, null, 4.5, 230, 65, "🐦", ["birds", "garden"], "Hang it in a tree and watch the birds visit."],

  // Car accessories
  ["Car Phone Holder", "auto", 15, null, 4.4, 1240, 150, "📍", ["phone", "car"], "Magnetic holder that sticks to your dashboard."],
  ["Dash Cam Full HD", "auto", 59, 79, 4.5, 520, 25, "🎥", ["camera", "car"], "Records every drive in Full HD with night vision."],
  ["Car Vacuum Cleaner", "auto", 29, null, 4.2, 330, 40, "🧽", ["cleaning", "car"], "Small but strong vacuum that plugs into your car."],
  ["Air Freshener Pack", "auto", 8, null, 4.1, 610, 200, "🌲", ["car", "smell"], "Six pine tree air fresheners."],
  ["Jump Starter", "auto", 69, 89, 4.6, 260, 15, "⚡", ["battery", "car"], "Start your car when the battery is dead. Also a power bank."],
  ["Toy Car Model: Red Racer", "auto", 25, null, 4.8, 180, 30, "🚗", ["model", "collector"], "Detailed 1:24 scale model car. Doors open!"],
];

const PRODUCTS = RAW_PRODUCTS.map((p, i) => {
  const [name, category, price, oldPrice, rating, reviews, stock, emoji, tags, description] = p;
  const cat = CATEGORIES.find((c) => c.id === category);
  return {
    id: "p" + (i + 1),
    name, category, price, oldPrice, rating, reviews, stock, emoji, tags, description,
    colors: cat.colors,
    added: i, // used for "newest" sorting
  };
});

const COUPONS = {
  SLAP10: { type: "percent", value: 10, label: "10% off everything" },
  POLQ20: { type: "percent", value: 20, label: "20% off (friend code)" },
  FREESHIP: { type: "shipping", value: 0, label: "Free delivery" },
  NIKI5: { type: "fixed", value: 5, label: "€5 off" },
};
