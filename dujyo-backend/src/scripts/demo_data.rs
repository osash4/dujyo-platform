use std::collections::HashMap;

pub async fn initialize_demo_data() -> Result<(), Box<dyn std::error::Error>> {
    println!("🎵 Initializing Dujyo Demo Data...");

    // Artistas demo
    let demo_artists = vec![
        ("Bad Bunny", "badbunny.dujyo", 1_000_000.0),
        ("The Weeknd", "theweeknd.dujyo", 800_000.0),
        ("Rosalía", "rosalia.dujyo", 600_000.0),
    ];

    // Usuarios demo
    let demo_users = vec![("user1", "premium"), ("user2", "pro"), ("user3", "free")];

    // Canciones demo
    let demo_songs = vec![
        ("Dákiti", "Bad Bunny", "urban"),
        ("Blinding Lights", "The Weeknd", "pop"),
        ("Malamente", "Rosalía", "flamenco"),
    ];

    println!("✅ Created {} demo artists", demo_artists.len());
    println!("✅ Created {} demo users", demo_users.len());
    println!("✅ Created {} demo songs", demo_songs.len());
    println!("🎉 Demo data initialization complete!");

    Ok(())
}

pub struct DemoData {
    pub artists: HashMap<String, f64>,
    pub users: HashMap<String, String>,
    pub songs: HashMap<String, (String, String)>,
}

impl DemoData {
    pub fn new() -> Self {
        let mut artists = HashMap::new();
        artists.insert("Bad Bunny".to_string(), 1_000_000.0);
        artists.insert("The Weeknd".to_string(), 800_000.0);
        artists.insert("Rosalía".to_string(), 600_000.0);

        let mut users = HashMap::new();
        users.insert("user1".to_string(), "premium".to_string());
        users.insert("user2".to_string(), "pro".to_string());
        users.insert("user3".to_string(), "free".to_string());

        let mut songs = HashMap::new();
        songs.insert(
            "Dákiti".to_string(),
            ("Bad Bunny".to_string(), "urban".to_string()),
        );
        songs.insert(
            "Blinding Lights".to_string(),
            ("The Weeknd".to_string(), "pop".to_string()),
        );
        songs.insert(
            "Malamente".to_string(),
            ("Rosalía".to_string(), "flamenco".to_string()),
        );

        Self {
            artists,
            users,
            songs,
        }
    }
}
