use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Transaction {
    pub from: String,
    pub to: String,
    pub amount: u64,
    pub nft_id: Option<String>, // Si la transacción es de un NFT, tendrá un ID
}

impl Transaction {
    fn is_valid(&self) -> bool {
        !self.from.is_empty() && !self.to.is_empty() && self.amount > 0
    }
}

#[derive(Clone, Debug)]
pub struct NFT {
    pub id: String,
    pub creator: String,
    pub owner: String,
    pub price: u64,
    pub ipfs_hash: Option<String>, // El hash de IPFS para el contenido asociado al NFT
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Block {
    pub timestamp: u64,
    pub transactions: Vec<Transaction>,
    pub previous_hash: String,
    pub hash: String,
    pub validator: Option<String>,
}

impl Block {
    pub fn calculate_hash(&self) -> String {
        // Simplified hash calculation - in a real implementation you would use a proper hash function
        let mut data = self.timestamp.to_string();
        for transaction in &self.transactions {
            data.push_str(&transaction.from);
            data.push_str(&transaction.to);
            data.push_str(&transaction.amount.to_string());
            if let Some(nft_id) = &transaction.nft_id {
                data.push_str(nft_id);
            }
        }
        data.push_str(&self.previous_hash);
        if let Some(validator) = &self.validator {
            data.push_str(validator);
        }
        let hash_value = data.len() as u64 * 31 + data.chars().map(|c| c as u64).sum::<u64>();
        format!("{:x}", hash_value)
    }
}

#[derive(Clone, Debug)]
pub struct Blockchain {
    pub chain: Vec<Block>,
    pub pending_transactions: Vec<Transaction>,
    pub validators: HashMap<String, u64>,
    pub minimum_stake: u64,
    pub balances: HashMap<String, u64>,
    pub nft_registry: HashMap<String, NFT>, // Registro de NFTs
    pub proposals: HashMap<String, Proposal>, // Propuestas de gobernanza
    pub transaction_fees: u64, // Tarifa por transacción
}

#[derive(Clone, Debug)]
pub struct Proposal {
    pub description: String,
    pub votes_for: u64,
    pub votes_against: u64,
    pub end_time: u64, // Fecha de finalización de la votación
}

impl Blockchain {
    pub fn new() -> Self {
        let blockchain = Blockchain {
            chain: vec![Blockchain::create_genesis_block()],
            pending_transactions: Vec::new(),
            validators: HashMap::new(),
            minimum_stake: 1000,
            balances: HashMap::new(),
            nft_registry: HashMap::new(),
            proposals: HashMap::new(),
            transaction_fees: 10, // Ejemplo de tarifa por transacción
        };
        
        blockchain
    }

    // Método para conectar (simplificado sin RPC)
    pub fn connect(&self) -> Result<(), String> {
        println!("Blockchain connected successfully (RPC removed)");
        Ok(())
    }

    fn create_genesis_block() -> Block {
        let genesis_address = "0x0000000000000000000000000000000000000000".to_string();
        let recipient_address = "XW1111111111111111111111111111111111111111".to_string();
        
        let genesis_transaction = Transaction {
            from: genesis_address.clone(),
            to: recipient_address.clone(),
            amount: 1,
            nft_id: None,
        };

        let mut balances = HashMap::new();
        balances.insert(genesis_address.clone(), 1000);
        balances.insert(recipient_address, 0);

        let mut block = Block {
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
            transactions: vec![genesis_transaction],
            previous_hash: "0".to_string(),
            hash: "".to_string(),
            validator: None,
        };

        block.hash = block.calculate_hash(); // Calcular el hash del bloque génesis

        block
    }

    pub fn get_latest_block(&self) -> &Block {
        self.chain.last().unwrap()
    }

    pub fn add_transaction(&mut self, transaction: Transaction) -> Result<(), String> {
        if !transaction.is_valid() {
            return Err("Transacción inválida".to_string());
        }

        let sender_balance = self.balances.get(&transaction.from).cloned().unwrap_or(0);
        if sender_balance < transaction.amount + self.transaction_fees {
            return Err("Saldo insuficiente".to_string());
        }

        self.balances.insert(transaction.from.clone(), sender_balance - transaction.amount - self.transaction_fees);
        let receiver_balance = self.balances.get(&transaction.to).cloned().unwrap_or(0);
        self.balances.insert(transaction.to.clone(), receiver_balance + transaction.amount);

        self.pending_transactions.push(transaction);
        Ok(())
    }

    // Método para agregar un validador
    pub fn add_validator(&mut self, address: String, stake: u64) -> bool {
        if stake >= self.minimum_stake {
            self.validators.insert(address.clone(), stake);
            true
        } else {
            false
        }
    }

    // Método para registrar un NFT
    pub fn register_nft(&mut self, creator: String, price: u64, ipfs_hash: Option<String>) -> Result<String, String> {
        let creator_balance = self.balances.get(&creator).cloned().unwrap_or(0);
        if creator_balance < price {
            return Err("Saldo insuficiente para registrar el NFT".to_string());
        }

        let nft_id = format!("NFT-{}", self.nft_registry.len() + 1);
        let nft = NFT {
            id: nft_id.clone(),
            creator: creator.clone(),  // Clonamos 'creator'
            owner: creator.clone(),    // Clonamos 'creator'
            price,
            ipfs_hash,
        };
        self.nft_registry.insert(nft_id.clone(), nft);
        Ok(nft_id)
    }

    // Método para crear una propuesta de gobernanza
    pub fn create_proposal(&mut self, proposal_id: String, description: String, end_time: u64) -> Result<(), String> {
        if self.proposals.contains_key(&proposal_id) {
            return Err("Propuesta ya existe".to_string());
        }

        if end_time <= SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() {
            return Err("Fecha de finalización inválida".to_string());
        }

        let proposal = Proposal {
            description,
            votes_for: 0,
            votes_against: 0,
            end_time,
        };
        self.proposals.insert(proposal_id, proposal);

        // Agregar una expresión de retorno explícita
        Ok(())
    }

    // Método para votar en una propuesta de gobernanza
    pub fn vote_on_proposal(&mut self, proposal_id: String, vote_for: bool) -> Result<(), String> {
        let proposal = self.proposals.get_mut(&proposal_id);
        if let Some(proposal) = proposal {
            if vote_for {
                proposal.votes_for += 1;
            } else {
                proposal.votes_against += 1;
            }
            Ok(())
        } else {
            Err("Propuesta no encontrada".to_string())
        }
    }

    // Método de validación de la cadena
    fn is_block_valid(&self, current_block: &Block, previous_block: &Block) -> bool {
        current_block.hash == current_block.calculate_hash() &&
        current_block.previous_hash == previous_block.hash
    }
    
    pub fn is_chain_valid(&self) -> bool {
        for i in 1..self.chain.len() {
            let current_block = &self.chain[i];
            let previous_block = &self.chain[i - 1];

            if current_block.hash != current_block.calculate_hash() {
                return false;
            }

            if current_block.previous_hash != previous_block.hash {
                return false;
            }
        }
        true
    }

    // Implementación del método get_balance
    pub fn get_balance(&self, address: &str) -> u64 {
        *self.balances.get(address).unwrap_or(&0)
    }
}

// JSON-RPC server removed - use HTTP RPC server instead