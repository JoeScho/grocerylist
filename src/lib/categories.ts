export interface Category {
  id: string
  label: string
  emoji: string
  color: string
}

// Ordered roughly the way a UK supermarket is laid out.
export const CATEGORIES: Category[] = [
  { id: 'produce', label: 'Fruit & Veg', emoji: '🥕', color: '#3ecf6e' },
  { id: 'bakery', label: 'Bakery', emoji: '🥖', color: '#f5a623' },
  { id: 'meat', label: 'Meat & Fish', emoji: '🍗', color: '#ff5a5f' },
  { id: 'dairy', label: 'Dairy & Eggs', emoji: '🧀', color: '#ffd23f' },
  { id: 'chilled', label: 'Chilled', emoji: '🧊', color: '#3fc1ff' },
  { id: 'pantry', label: 'Cupboard', emoji: '🥫', color: '#b06bff' },
  { id: 'spices', label: 'Herbs & Spices', emoji: '🌶️', color: '#ff7a3d' },
  { id: 'world', label: 'World Foods', emoji: '🍜', color: '#ff4fa3' },
  { id: 'frozen', label: 'Frozen', emoji: '❄️', color: '#5b8cff' },
  { id: 'snacks', label: 'Snacks & Sweets', emoji: '🍫', color: '#c47a4a' },
  { id: 'drinks', label: 'Drinks', emoji: '🧃', color: '#22c7b8' },
  { id: 'household', label: 'Household', emoji: '🧻', color: '#8892a6' },
  { id: 'misc', label: 'Misc', emoji: '🛒', color: '#a0a0b8' },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c])) as Record<string, Category>

// Checked in order: earlier entries win, so put specific phrases
// ("coconut milk", "chicken stock") ahead of the generic words they contain.
const RULES: [string, string[]][] = [
  ['household', ['toilet', 'loo roll', 'kitchen roll', 'bin bag', 'washing up', 'detergent', 'soap', 'shampoo', 'toothpaste', 'foil', 'cling film', 'baking paper', 'sponge', 'bleach', 'tissue', 'nappy', 'battery', 'bulb']],
  ['spices', ['salt', 'pepper flake', 'black pepper', 'peppercorn', 'cumin', 'coriander seed', 'ground coriander', 'paprika', 'turmeric', 'cinnamon', 'nutmeg', 'clove', 'cardamom', 'chilli powder', 'chili powder', 'chilli flake', 'chili flake', 'cayenne', 'garam masala', 'curry powder', 'oregano', 'bay leaf', 'thyme', 'rosemary', 'sage', 'allspice', 'fennel seed', 'mustard seed', 'star anise', 'saffron', 'za\'atar', 'sumac', 'five spice', 'italian seasoning', 'mixed herb', 'seasoning', 'ginger powder', 'ground ginger']],
  ['pantry', ['coconut milk', 'coconut cream', 'chicken stock', 'beef stock', 'vegetable stock', 'veg stock', 'stock cube', 'tomato puree', 'tomato paste', 'passata', 'chopped tomato', 'peanut butter', 'almond butter', 'baking powder', 'bicarbonate', 'cornflour', 'lentil', 'chickpea', 'kidney bean', 'black bean', 'butter bean', 'cannellini', 'baked bean', 'rice', 'pasta', 'spaghetti', 'penne', 'fusilli', 'linguine', 'tagliatelle', 'lasagne', 'orzo', 'couscous', 'quinoa', 'bulgur', 'noodle', 'flour', 'sugar', 'honey', 'maple syrup', 'golden syrup', 'oil', 'vinegar', 'oat', 'cereal', 'jam', 'marmalade', 'nut', 'almond', 'cashew', 'peanut', 'walnut', 'pecan', 'pine nut', 'seed', 'raisin', 'sultana', 'cocoa', 'yeast', 'vanilla', 'breadcrumb', 'panko', 'stock', 'tinned', 'tin ', 'can ', 'ketchup', 'mayonnaise', 'mayo', 'mustard', 'chutney', 'pesto', 'gravy', 'olive', 'caper', 'tuna']],
  ['world', ['soy sauce', 'soya sauce', 'tamari', 'fish sauce', 'oyster sauce', 'hoisin', 'sriracha', 'gochujang', 'miso', 'mirin', 'sesame oil', 'curry paste', 'harissa', 'tahini', 'tortilla', 'taco', 'wrap', 'naan', 'poppadom', 'rice paper', 'sweet chilli sauce', 'chipotle', 'enchilada', 'salsa']],
  ['frozen', ['frozen', 'ice cream', 'peas', 'pea', 'edamame']],
  ['dairy', ['milk', 'butter', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'halloumi', 'ricotta', 'mascarpone', 'cream', 'creme fraiche', 'crème fraîche', 'yoghurt', 'yogurt', 'egg', 'paneer', 'burrata', 'gruyere', 'brie', 'goat']],
  ['meat', ['chicken', 'beef', 'pork', 'lamb', 'mince', 'steak', 'bacon', 'pancetta', 'chorizo', 'sausage', 'ham', 'prosciutto', 'salami', 'turkey', 'duck', 'venison', 'salmon', 'cod', 'haddock', 'prawn', 'shrimp', 'fish', 'mackerel', 'sea bass', 'trout', 'scallop', 'mussel', 'squid', 'crab', 'lobster', 'anchov*']],
  ['chilled', ['tofu', 'tempeh', 'hummus', 'houmous', 'fresh pasta', 'gnocchi', 'pastry', 'filo', 'puff', 'quorn', 'tzatziki', 'guacamole', 'coleslaw']],
  ['bakery', ['bread', 'loaf', 'baguette', 'roll', 'bun', 'brioche', 'ciabatta', 'focaccia', 'sourdough', 'pitta', 'pita', 'bagel', 'croissant', 'crumpet', 'muffin']],
  ['produce', ['onion', 'shallot', 'garlic', 'ginger', 'potato', 'sweet potato', 'carrot', 'parsnip', 'celery', 'leek', 'tomato', 'pepper', 'chilli', 'chili', 'courgette', 'zucchini', 'aubergine', 'eggplant', 'broccoli', 'cauliflower', 'cabbage', 'kale', 'spinach', 'lettuce', 'rocket', 'salad', 'cucumber', 'avocado', 'mushroom', 'squash', 'pumpkin', 'beetroot', 'sweetcorn', 'corn', 'bean sprout', 'beansprout', 'green bean', 'mangetout', 'sugar snap', 'asparagus', 'pak choi', 'bok choy', 'spring onion', 'radish', 'fennel', 'lemon', 'lime', 'orange', 'apple', 'pear', 'banana', 'berr*', 'strawberr*', 'raspberr*', 'blueberr*', 'grape', 'mango', 'pineapple', 'melon', 'peach', 'plum', 'cherry', 'kiwi', 'pomegranate', 'fig', 'date', 'coriander', 'parsley', 'basil', 'mint', 'dill', 'chive', 'lemongrass', 'herb']],
  ['snacks', ['chocolate', 'crisp', 'biscuit', 'cookie', 'sweet', 'popcorn', 'cracker', 'cake']],
  ['drinks', ['wine', 'beer', 'juice', 'water', 'coffee', 'tea', 'squash', 'lemonade', 'cola', 'tonic', 'gin', 'vodka', 'rum', 'whisky']],
]

// Whole-word match, allowing a plural "s"/"es". A trailing "*" makes the
// keyword a prefix ("strawberr*" covers strawberry and strawberries).
function matches(name: string, keyword: string): boolean {
  if (keyword.endsWith(' ')) return (name + ' ').includes(keyword)
  const prefix = keyword.endsWith('*')
  const k = (prefix ? keyword.slice(0, -1) : keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(prefix ? `(^|\\s)${k}` : `(^|\\s)${k}(e?s)?($|\\s)`)
  return re.test(name)
}

export function categorise(name: string, overrides: Record<string, string> = {}): string {
  const n = name.toLowerCase().trim()
  if (overrides[n]) return overrides[n]
  for (const [cat, keywords] of RULES) {
    if (keywords.some(k => matches(n, k))) return cat
  }
  return 'misc'
}
