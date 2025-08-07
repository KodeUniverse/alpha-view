use axum::{
    routing::[get, post]
    Router,
    Json
}

use serde:: {Serialize, Deserialize};


#tokio::main
async fn main() {
    let app = Router::new()
        .route("/", get(root))


} 

async fn root() {
    
}