/*
==================================================
NAMES
==================================================

Big name pools for dogs and (upcoming) NPCs.
==================================================
*/

export const DOG_NAMES = [
  /* japanese */
  "Kuro", "Hana", "Mochi", "Yuki", "Kiko", "Taro",
  "Suki", "Nori", "Momo", "Kin", "Aki", "Fuji",
  "Chibi", "Rin", "Sora", "Ume", "Goma", "Anko",
  "Kaya", "Tobi", "Zen", "Haru", "Natsu", "Kaede",
  "Hoshi", "Tsuki", "Kumo", "Kaze", "Yume", "Sakura",
  "Ren", "Kota", "Hachi", "Jiro", "Saburo", "Shiro",
  "Kurumi", "Azuki", "Daifuku", "Dango", "Matcha", "Yuzu",
  "Kabosu", "Tofu", "Miso", "Bento", "Udon", "Soba",
  "Ramen", "Gyoza", "Taiyaki", "Manju", "Kinako", "Kombu",

  /* food & sweets */
  "Biscuit", "Cookie", "Muffin", "Waffle", "Pancake", "Toast",
  "Peanut", "Pretzel", "Nacho", "Taco", "Churro", "Bagel",
  "Pepper", "Ginger", "Cinnamon", "Nutmeg", "Olive", "Pickle",
  "Mango", "Kiwi", "Melon", "Berry", "Cocoa", "Latte",
  "Espresso", "Chai", "Pudding", "Jelly", "Caramel", "Honey",
  "Maple", "Butterscotch", "Marshmallow", "Snickers", "Truffle", "Fudge",

  /* classic & cute */
  "Buddy", "Lucky", "Rocky", "Max", "Charlie", "Cooper",
  "Milo", "Teddy", "Oscar", "Leo", "Finn", "Gus",
  "Bella", "Luna", "Daisy", "Ruby", "Rosie", "Willow",
  "Poppy", "Hazel", "Ivy", "Clover", "Pearl", "Coral",
  "Ziggy", "Banjo", "Pippin", "Waldo", "Chester", "Bruno",
  "Nala", "Koda", "Juno", "Nova", "Echo", "Pixel",
  "Scout", "Ranger", "Sunny", "Storm", "Shadow", "Comet",
  "Biscotti", "Noodle", "Pumpkin", "Sprout", "Acorn", "Maplewood",

  /* fluffy vibes */
  "Fluffy", "Puffball", "Cotton", "Cloud", "Snowball", "Marble",
  "Pebble", "Bubbles", "Twinkle", "Doodle", "Wiggles", "Buttons"
];

export const NPC_FIRST_NAMES = [
  /* everyday names with kairosoft charm */
  "Aiko", "Haruto", "Yui", "Sota", "Mei", "Ren",
  "Emma", "Liam", "Olivia", "Noah", "Mia", "Ethan",
  "Greta", "Hugo", "Ida", "Felix", "Clara", "Oskar",
  "Pia", "Jonas", "Lene", "Bruno", "Tilda", "Anton",
  "Marisol", "Diego", "Lucia", "Mateo", "Rosa", "Pablo",
  "Wendy", "Barnaby", "Poppy", "Alfie", "Maisie", "Monty",
  "Sam", "Riley", "Quinn", "Avery", "Jules", "Casey",
  "Nadia", "Elio", "Suri", "Kenji", "Amara", "Theo",
  "Betty", "Stanley", "Doris", "Walter", "Edith", "Ernest",
  "Juniper", "Basil", "Sage", "Rosemary", "Laurel", "Fern"
];

export const NPC_LAST_NAMES = [
  /* playful pet-town surnames */
  "Barkley", "Pawson", "Whisker", "Tailor", "Fetcher", "Houndsworth",
  "Wagner", "Beagleman", "Colliewood", "Shepard", "Terrier", "Pomsky",
  "Bonebury", "Kibbleton", "Leashley", "Fluffington", "Snoutman", "Howler",

  /* ordinary but warm */
  "Tanaka", "Sato", "Yamamoto", "Kobayashi", "Nakamura", "Fujii",
  "Miller", "Brooks", "Hansen", "Keller", "Vogel", "Winter",
  "Sommer", "Lindgren", "Moreau", "Rossi", "Novak", "Garcia",
  "Holloway", "Bramble", "Meadows", "Rivers", "Hillcrest", "Gardner",
  "Applewood", "Cloverfield", "Honeywell", "Berrymore", "Ashford", "Pinewood"
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function randomDogName() {
  return pick(DOG_NAMES);
}

export function randomNpcName() {
  return `${pick(NPC_FIRST_NAMES)} ${pick(NPC_LAST_NAMES)}`;
}
