use std::collections::HashMap;

// Estructura para la Main Wallet de Dujyo
#[derive(Debug, Clone)]
pub struct DujyoMainWallet {
    pub address: String,
    pub private_key: String,
    pub public_key: String,
    pub seed_phrase: String,
    pub wallet_type: String,
}

impl DujyoMainWallet {
    pub fn new() -> Self {
        // Generar seed phrase de 24 palabras (simplificado)
        let seed_phrase = Self::generate_seed_phrase();
        
        // Generar private key desde seed phrase
        let private_key = Self::seed_to_private_key(&seed_phrase);
        
        // Generar public key desde private key
        let public_key = Self::private_to_public_key(&private_key);
        
        // Generar address Dujyo desde public key
        let address = Self::public_to_address(&public_key);
        
        DujyoMainWallet {
            address,
            private_key,
            public_key,
            seed_phrase,
            wallet_type: "MAIN_TREASURY".to_string(),
        }
    }
    
    fn generate_seed_phrase() -> String {
        // Lista de palabras BIP39 (simplificada para demo)
        let words = vec![
            "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
            "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
            "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
            "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
            "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
            "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter",
            "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger",
            "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
            "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic",
            "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
            "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset",
            "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
            "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake",
            "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge",
            "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain",
            "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become",
            "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit",
            "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology",
            "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless",
            "blind", "blood", "blossom", "blow", "blue", "blur", "blush", "board", "boat", "body",
            "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss",
            "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread",
            "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze",
            "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb",
            "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy",
            "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call",
            "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas",
            "canyon", "capable", "capital", "captain", "car", "carbon", "card", "care", "career", "careful",
            "careless", "cargo", "carpet", "carry", "cart", "case", "cash", "casino", "cast", "casual",
            "cat", "catalog", "catch", "category", "cattle", "caught", "cause", "caution", "cave", "ceiling",
            "celery", "cement", "census", "century", "cereal", "certain", "chair", "chalk", "champion", "change",
            "chaos", "charge", "chase", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken",
            "chief", "child", "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar",
            "cinnamon", "circle", "citizen", "city", "civil", "claim", "clamp", "clarify", "claw", "clay",
            "clean", "clerk", "clever", "click", "client", "cliff", "climb", "cling", "clinic", "clip",
            "clock", "clog", "close", "cloth", "cloud", "clown", "club", "clump", "cluster", "clutch",
            "coach", "coast", "coconut", "code", "coffee", "coil", "coin", "collect", "color", "column",
            "come", "comfort", "comic", "common", "company", "concert", "conduct", "confirm", "congress", "connect",
            "consider", "control", "convince", "cook", "cool", "copper", "copy", "coral", "core", "corn",
            "correct", "cost", "cotton", "couch", "country", "couple", "course", "cousin", "cover", "coyote",
            "crack", "cradle", "craft", "cram", "crane", "crash", "crater", "crawl", "crazy", "cream",
            "credit", "creek", "crew", "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch",
            "crowd", "crucial", "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal", "cube",
            "culture", "cup", "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute",
            "cycle", "dad", "damage", "damp", "dance", "danger", "daring", "dash", "daughter", "dawn",
            "day", "deal", "debate", "debris", "decade", "december", "decide", "decline", "decorate", "decrease",
            "deer", "defense", "define", "defy", "degree", "delay", "deliver", "demand", "demise", "denial",
            "dentist", "deny", "depart", "depend", "deposit", "depth", "deputy", "derive", "describe", "desert",
            "design", "desk", "despair", "destroy", "detail", "detect", "develop", "device", "devote", "diagram",
            "dial", "diamond", "diary", "dice", "diesel", "diet", "differ", "digital", "dignity", "dilemma",
            "dinner", "dinosaur", "direct", "dirt", "disagree", "discover", "disease", "dish", "dismiss", "disorder",
            "display", "distance", "divert", "divide", "divorce", "dizzy", "doctor", "document", "dog", "doll",
            "dolphin", "domain", "donate", "donkey", "donor", "door", "dose", "double", "dove", "draft",
            "dragon", "drama", "drastic", "draw", "dream", "dress", "drift", "drill", "drink", "drip",
            "drive", "drop", "drum", "dry", "duck", "dumb", "dune", "during", "dust", "dutch",
            "duty", "dwarf", "dynamic", "eager", "eagle", "early", "earn", "earth", "easily", "east",
            "easy", "echo", "ecology", "economy", "edge", "edit", "educate", "effort", "egg", "eight",
            "either", "elbow", "elder", "electric", "elegant", "element", "elephant", "elevator", "elite", "else",
            "embark", "embody", "embrace", "emerge", "emotion", "employ", "empower", "empty", "enable", "enact",
            "end", "endless", "endorse", "enemy", "energy", "enforce", "engage", "engine", "enjoy", "enlist",
            "enough", "enrich", "enroll", "ensure", "enter", "entire", "entry", "envelope", "episode", "equal",
            "equip", "era", "erase", "erode", "erosion", "erupt", "escape", "essay", "essence", "estate",
            "eternal", "ethics", "evidence", "evil", "evoke", "evolve", "exact", "example", "excess", "exchange",
            "excite", "exclude", "excuse", "execute", "exercise", "exhaust", "exhibit", "exile", "exist", "exit",
            "exotic", "expand", "expect", "expire", "explain", "expose", "express", "extend", "extra", "eye",
            "eyebrow", "fabric", "face", "faculty", "fade", "faint", "faith", "fall", "false", "fame",
            "family", "famous", "fan", "fancy", "fantasy", "farm", "fashion", "fat", "fatal", "father",
            "fatigue", "fault", "favorite", "feature", "february", "federal", "fee", "feed", "feel", "female",
            "fence", "festival", "fetch", "fever", "few", "fiber", "fiction", "field", "figure", "file",
            "film", "filter", "final", "find", "fine", "finger", "finish", "fire", "firm", "first",
            "fiscal", "fish", "fitness", "fit", "fitting", "five", "fix", "flag", "flame", "flash",
            "flat", "flavor", "flee", "flight", "flip", "float", "flock", "floor", "flower", "fluid",
            "flush", "fly", "foam", "focus", "fog", "foil", "fold", "follow", "food", "foot",
            "force", "forest", "forget", "fork", "fortune", "forum", "forward", "fossil", "foster", "found",
            "fox", "fragile", "frame", "frequent", "fresh", "friend", "fringe", "frog", "front", "frost",
            "frown", "frozen", "fruit", "fuel", "fun", "funny", "furnace", "fury", "future", "gadget",
            "gain", "galaxy", "gallery", "game", "gap", "garage", "garbage", "garden", "garlic", "garment",
            "gas", "gasp", "gate", "gather", "gauge", "gaze", "general", "genius", "genre", "gentle",
            "genuine", "gesture", "ghost", "giant", "gift", "giggle", "ginger", "giraffe", "girl", "give",
            "glad", "glance", "glare", "glass", "glide", "glimpse", "globe", "gloom", "glory", "glove",
            "glow", "glue", "goat", "goddess", "gold", "good", "goose", "gorilla", "gospel", "gossip",
            "govern", "gown", "grab", "grace", "grain", "grant", "grape", "grass", "gravity", "great",
            "green", "grid", "grief", "grit", "grocery", "group", "grow", "grunt", "guard", "guess",
            "guide", "guilt", "guitar", "gun", "gym", "habit", "hair", "half", "hammer", "hamster",
            "hand", "happy", "harbor", "hard", "harsh", "harvest", "hash", "hastily", "hat", "have",
            "hawk", "hazard", "head", "health", "heart", "heavy", "hedgehog", "height", "hello", "helmet",
            "help", "hen", "hero", "hidden", "high", "hill", "hint", "hip", "hire", "history",
            "hobby", "hockey", "hold", "hole", "holiday", "hollow", "home", "honey", "hood", "hope",
            "horn", "horror", "horse", "hospital", "host", "hotel", "hour", "hover", "hub", "huge",
            "human", "humble", "humor", "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt", "husband",
            "hybrid", "ice", "icon", "idea", "identify", "idle", "ignore", "ill", "illegal", "illness",
            "image", "imitate", "immense", "immune", "impact", "impose", "improve", "impulse", "inch", "include",
            "income", "increase", "index", "indicate", "indoor", "industry", "infant", "inflict", "inform", "inhale",
            "inherit", "initial", "inject", "injury", "inmate", "inner", "innocent", "input", "inquiry", "insane",
            "insect", "inside", "inspire", "install", "intact", "interest", "into", "invest", "invite", "involve",
            "iron", "island", "isolate", "issue", "item", "ivory", "jacket", "jaguar", "jar", "jazz",
            "jealous", "jeans", "jelly", "jewel", "job", "join", "joke", "journey", "joy", "judge",
            "juice", "jump", "june", "jungle", "junior", "junk", "just", "kangaroo", "keen", "keep",
            "ketchup", "key", "kick", "kid", "kidney", "kind", "kingdom", "kiss", "kit", "kitchen",
            "kite", "kitten", "kiwi", "knee", "knife", "knock", "knot", "know", "lab", "label",
            "labor", "ladder", "lady", "lake", "lamp", "land", "landscape", "lane", "language", "laptop",
            "large", "later", "latin", "laugh", "laundry", "lava", "law", "lawn", "lawsuit", "layer",
            "lazy", "leader", "leaf", "learn", "leave", "lecture", "left", "leg", "legal", "legend",
            "leisure", "lemon", "lend", "length", "lens", "leopard", "lesson", "letter", "level", "liar",
            "liberty", "library", "license", "life", "lift", "light", "like", "limb", "limit", "link",
            "lion", "liquid", "list", "little", "live", "lizard", "load", "loan", "lobster", "local",
            "lock", "logic", "lonely", "long", "loop", "lottery", "loud", "lounge", "love", "loyal",
            "lucky", "luggage", "lumber", "lunar", "lunch", "luxury", "lyrics", "machine", "mad", "magic",
            "magnet", "maid", "mail", "main", "major", "make", "mammal", "man", "manage", "mandate",
            "mango", "mansion", "manual", "maple", "marble", "march", "margin", "marine", "market", "marriage",
            "mask", "mass", "master", "match", "material", "math", "matrix", "matter", "maximum", "maze",
            "meadow", "mean", "measure", "meat", "mechanic", "medal", "media", "melody", "melt", "member",
            "memory", "mention", "menu", "mercy", "merge", "merit", "merry", "mesh", "message", "metal",
            "method", "middle", "midnight", "milk", "million", "mimic", "mind", "minimum", "minor", "minute",
            "miracle", "mirror", "misery", "miss", "mistake", "mix", "mixed", "mixture", "mobile", "model",
            "modify", "mom", "moment", "monitor", "monkey", "monster", "month", "moon", "moral", "more",
            "morning", "mosquito", "mother", "motion", "motor", "mountain", "mouse", "move", "movie", "much",
            "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music", "must", "mutual", "myself",
            "mystery", "myth", "naive", "name", "napkin", "narrow", "nasty", "nation", "nature", "near",
            "neck", "need", "negative", "neglect", "neither", "nephew", "nerve", "nest", "net", "network",
            "neutral", "never", "news", "next", "nice", "night", "noble", "noise", "nominee", "noodle",
            "normal", "north", "nose", "notable", "note", "nothing", "notice", "novel", "now", "nuclear",
            "number", "nurse", "nut", "oak", "obey", "object", "oblige", "obscure", "observe", "obtain",
            "obvious", "occur", "ocean", "october", "odor", "off", "offer", "office", "often", "oil",
            "okay", "old", "olive", "olympic", "omit", "once", "one", "onion", "online", "only",
            "open", "opera", "opinion", "oppose", "option", "orange", "orbit", "orchard", "order", "ordinary",
            "organ", "orient", "original", "orphan", "ostrich", "other", "our", "ours", "ourselves", "out",
            "outdoor", "outer", "outline", "outlook", "output", "outrage", "outset", "outside", "outstanding", "oval",
            "oven", "over", "own", "owner", "oxygen", "oyster", "ozone", "pact", "paddle", "page",
            "pair", "palace", "palm", "panda", "panel", "panic", "panther", "paper", "parade", "parent",
            "park", "parrot", "party", "pass", "patch", "path", "patient", "patrol", "pattern", "pause",
            "pave", "payment", "peace", "peanut", "pear", "peasant", "pelican", "pen", "penalty", "pencil",
            "people", "pepper", "perfect", "permit", "person", "pet", "phone", "photo", "phrase", "physical",
            "piano", "picnic", "picture", "piece", "pig", "pigeon", "pill", "pilot", "pink", "pioneer",
            "pipe", "pistol", "pitch", "pizza", "place", "plague", "plain", "plan", "planet", "plastic",
            "plate", "play", "please", "pledge", "pluck", "plug", "plunge", "poem", "poet", "point",
            "polar", "pole", "police", "pond", "pony", "pool", "poor", "pop", "popcorn", "popular",
            "portion", "position", "possible", "post", "potato", "pottery", "poverty", "powder", "power", "practice",
            "praise", "predict", "prefer", "prepare", "present", "pretty", "prevent", "price", "pride", "primary",
            "print", "priority", "prison", "private", "prize", "problem", "process", "produce", "profit", "program",
            "project", "promote", "proof", "property", "prosper", "protect", "proud", "provide", "public", "pudding",
            "pull", "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy", "pure", "purple", "purpose",
            "purse", "push", "put", "puzzle", "pyramid", "quality", "quantum", "quarter", "question", "quick",
            "quit", "quiz", "quote", "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail",
            "rain", "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare", "rate",
            "rather", "raven", "raw", "razor", "ready", "real", "reason", "rebel", "rebuild", "recall",
            "receive", "recipe", "record", "recover", "recruit", "red", "reduce", "reflect", "reform", "refuse",
            "region", "regret", "regular", "reject", "relax", "release", "relief", "rely", "remain", "remember",
            "remind", "remove", "render", "renew", "rent", "reopen", "repair", "repeat", "replace", "reply",
            "report", "require", "rescue", "resemble", "resist", "resource", "response", "result", "retire", "retreat",
            "return", "reunion", "reveal", "review", "reward", "rhythm", "rib", "ribbon", "rice", "rich",
            "ride", "ridge", "rifle", "right", "rigid", "ring", "riot", "ripple", "risk", "ritual",
            "rival", "river", "road", "roast", "robot", "robust", "rocket", "romance", "roof", "rookie",
            "room", "rose", "rotate", "rough", "round", "route", "royal", "rubber", "rude", "rug",
            "rule", "rumor", "run", "runway", "rural", "rush", "rust", "sad", "saddle", "sadness",
            "safe", "sail", "salad", "salmon", "salon", "salt", "salute", "same", "sample", "sand",
            "satisfy", "satoshi", "sauce", "sausage", "save", "say", "scale", "scan", "scare", "scatter",
            "scene", "scheme", "school", "science", "scissors", "scorpion", "scout", "scrap", "screen", "script",
            "scrub", "sea", "search", "season", "seat", "second", "secret", "section", "security", "seed",
            "seek", "segment", "select", "sell", "seminar", "senior", "sense", "sentence", "series", "service",
            "session", "settle", "setup", "seven", "shadow", "shaft", "shallow", "share", "shed", "shell",
            "sheriff", "shield", "shift", "shine", "ship", "shiver", "shock", "shoe", "shoot", "shop",
            "shore", "short", "shoulder", "shove", "shrimp", "shrug", "shuffle", "shy", "sibling", "sick",
            "side", "siege", "sight", "sign", "silent", "silk", "silly", "silver", "similar", "simple",
            "since", "sing", "siren", "sister", "situate", "six", "size", "skate", "sketch", "ski",
            "skill", "skin", "skirt", "skull", "slab", "slam", "sleep", "slender", "slice", "slide",
            "slight", "slim", "slogan", "slot", "slow", "sluice", "slum", "slurp", "slush", "sly",
            "smack", "small", "smart", "smile", "smoke", "smooth", "smuggle", "snack", "snail", "snake",
            "snap", "snare", "snarl", "sneak", "sneeze", "sniff", "snore", "snort", "snout", "snow",
            "snub", "snuff", "snug", "soak", "soap", "soar", "sob", "soccer", "social", "sock",
            "soda", "sofa", "soft", "soggy", "soil", "solar", "soldier", "solid", "solo", "solution",
            "solve", "someone", "song", "soon", "sorry", "sort", "soul", "sound", "soup", "sour",
            "south", "space", "spare", "spark", "sparkle", "speak", "speed", "spell", "spend", "sphere",
            "spice", "spider", "spike", "spin", "spirit", "split", "splurge", "spoil", "sponsor", "spoon",
            "sport", "spot", "spouse", "spray", "spread", "spring", "spy", "square", "squash", "squeeze",
            "squirrel", "stable", "stadium", "staff", "stage", "stairs", "stamp", "stand", "start", "state",
            "stay", "steak", "steal", "steam", "steel", "steep", "stem", "step", "stereo", "stick",
            "still", "sting", "stink", "stir", "stock", "stomach", "stone", "stool", "stoop", "stop",
            "storage", "store", "storm", "story", "stove", "strategy", "street", "strike", "strip", "strive",
            "stroke", "stroll", "strong", "struggle", "strum", "strut", "stuck", "student", "stuff", "stump",
            "stun", "stunt", "style", "subdue", "subject", "submit", "subway", "succeed", "such", "sudden",
            "suffer", "sugar", "suggest", "suit", "suite", "sulfur", "sum", "summer", "sun", "sunny",
            "sunset", "super", "supply", "supreme", "sure", "surface", "surge", "surprise", "surround", "survey",
            "survive", "suspect", "sustain", "swallow", "swamp", "swap", "swarm", "sway", "swear", "sweat",
            "sweep", "sweet", "swell", "swim", "swing", "swirl", "switch", "sword", "symbol", "symptom",
            "syrup", "system", "table", "tackle", "tag", "tail", "talent", "talk", "tank", "tape",
            "target", "task", "taste", "tattoo", "taxi", "teach", "team", "tell", "ten", "tenant",
            "tennis", "tent", "term", "test", "text", "thank", "that", "the", "their", "them",
            "then", "theory", "there", "they", "thing", "think", "third", "this", "those", "though",
            "thought", "thousand", "thread", "threat", "three", "thrive", "throw", "thumb", "thunder", "thus",
            "tick", "tide", "tidy", "tie", "tiger", "tight", "tile", "till", "timber", "time",
            "tiny", "tip", "tire", "tired", "tissue", "title", "toast", "tobacco", "today", "toddler",
            "toe", "together", "toilet", "token", "tomato", "tomorrow", "tone", "tongue", "tonight", "tool",
            "tooth", "top", "topic", "topple", "torch", "tornado", "tortoise", "toss", "total", "touch",
            "tough", "tour", "toward", "tower", "town", "toy", "track", "trade", "traffic", "tragic",
            "train", "transfer", "trap", "trash", "travel", "tray", "treat", "tree", "trend", "trial",
            "tribe", "trick", "trigger", "trim", "trip", "trophy", "trouble", "truck", "true", "truly",
            "trumpet", "trust", "truth", "try", "tube", "tuition", "tumble", "tuna", "tunnel", "turbo",
            "turtle", "twelve", "twenty", "twice", "twin", "twist", "two", "type", "typical", "ugly",
            "umbrella", "unable", "unaware", "uncle", "uncover", "under", "undo", "unfair", "unfold", "unhappy",
            "unhealthy", "uniform", "unique", "unit", "universe", "unknown", "unlock", "until", "unusual", "unveil",
            "update", "upgrade", "uphold", "upon", "upper", "upset", "urban", "urge", "usage", "use",
            "used", "useful", "useless", "usual", "utility", "vacant", "vacuum", "vague", "valley", "valve",
            "van", "vanish", "vapor", "various", "vast", "vault", "vehicle", "velvet", "vendor", "venture",
            "venue", "verb", "verify", "version", "very", "vessel", "veteran", "viable", "vibrant", "vicious",
            "victory", "video", "view", "village", "vintage", "violin", "virtual", "virus", "visa", "visit",
            "visual", "vital", "vivid", "vocal", "voice", "void", "volcano", "volume", "vote", "voyage",
            "wage", "wagon", "wait", "wake", "walk", "wall", "walnut", "want", "war", "warm",
            "warn", "wash", "wasp", "waste", "water", "wave", "way", "weak", "wealth", "weapon",
            "wear", "weasel", "weather", "web", "wedding", "weed", "week", "weird", "welcome", "west",
            "wet", "whale", "what", "wheat", "wheel", "when", "where", "whip", "whisper", "white",
            "who", "whole", "whom", "whose", "why", "wicked", "wide", "widow", "width", "wife",
            "wild", "will", "win", "window", "wine", "wing", "wink", "winner", "winter", "wire",
            "wisdom", "wise", "wish", "witness", "wolf", "woman", "wonder", "wood", "wool", "word",
            "work", "world", "worry", "worth", "would", "wrap", "wreck", "wrestle", "wrist", "write",
            "wrong", "yard", "year", "yellow", "you", "young", "youth", "zebra", "zero", "zone",
            "zoo"
        ];
        
        let mut phrase = Vec::new();
        
        // Usar timestamp como seed para generar palabras
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        for i in 0..24 {
            let word_index = (timestamp + i as u64) as usize % words.len();
            phrase.push(words[word_index].to_string());
        }
        
        phrase.join(" ")
    }
    
    fn seed_to_private_key(seed: &str) -> String {
        // Hash simple del seed
        let mut hash = 0u64;
        for byte in seed.bytes() {
            hash = hash.wrapping_mul(31).wrapping_add(byte as u64);
        }
        format!("{:016x}", hash)
    }
    
    fn private_to_public_key(private_key: &str) -> String {
        // Hash simple de la private key
        let mut hash = 0u64;
        for byte in private_key.bytes() {
            hash = hash.wrapping_mul(31).wrapping_add(byte as u64);
        }
        format!("{:016x}", hash)
    }
    
    fn public_to_address(public_key: &str) -> String {
        // Hash simple de la public key
        let mut hash = 0u64;
        for byte in public_key.bytes() {
            hash = hash.wrapping_mul(31).wrapping_add(byte as u64);
        }
        format!("XW{:016x}", hash)
    }
    
    pub fn display_wallet_info(&self) {
        println!("🔐 DUJYO MAIN WALLET CREATED");
        println!("═══════════════════════════════════════════════════════════════");
        println!("📍 Address: {}", self.address);
        println!("🔑 Public Key: {}", self.public_key);
        println!("🌱 Seed Phrase: {}", self.seed_phrase);
        println!("🏷️  Type: {}", self.wallet_type);
        println!("═══════════════════════════════════════════════════════════════");
        println!("⚠️  SECURITY WARNING:");
        println!("   • Save this information in a SECURE location");
        println!("   • NEVER share your private key or seed phrase");
        println!("   • This is the MAIN TREASURY wallet for Dujyo");
        println!("═══════════════════════════════════════════════════════════════");
    }
}

fn main() {
    println!("🚀 Creating Dujyo Main Wallet...");
    
    let main_wallet = DujyoMainWallet::new();
    main_wallet.display_wallet_info();
    
    // Guardar en archivo seguro
    let wallet_data = format!(
        "DUJYO_MAIN_WALLET\n\
        Address: {}\n\
        Public Key: {}\n\
        Private Key: {}\n\
        Seed Phrase: {}\n\
        Type: {}\n\
        Created: {}\n",
        main_wallet.address,
        main_wallet.public_key,
        main_wallet.private_key,
        main_wallet.seed_phrase,
        main_wallet.wallet_type,
        "2025-01-25 20:30:00 UTC"
    );
    
    std::fs::write("dujyo_main_wallet.txt", wallet_data)
        .expect("Failed to write wallet file");
    
    println!("💾 Wallet data saved to: dujyo_main_wallet.txt");
    println!("🔒 Please move this file to a secure location and delete it from this directory!");
}
