# ADP Backend - Aram Draft Pick

Real-time backend service for League of Legends ARAM champion draft rooms, demonstrating advanced WebSocket management and race condition handling.

## What This Project Demonstrates

### Real-time Application Architecture
Built a production-ready backend handling concurrent game sessions with Socket.io for instant communication between multiple players in draft rooms.

### Race Condition Prevention
Implemented atomic locking mechanisms and debouncing to prevent race conditions when multiple users select champions simultaneously, ensuring data consistency across distributed clients.

### Multi-phase Game State Management
Designed a state machine handling complex game flows: Waiting → Planning → Draft → Done, with timer synchronization across all connected clients.

### Database Integration
Integrated Supabase (PostgreSQL) with real-time subscriptions, implementing transaction wrappers for atomic operations and handling concurrent database updates.

## Technical Implementation

### Core Technologies
- **Node.js + TypeScript** - Type-safe backend development
- **Express.js** - REST API framework  
- **Socket.io** - Real-time bidirectional communication
- **Supabase** - PostgreSQL database with real-time features
- **EJS** - Server-side templating for admin interfaces

### Key Features
- **Room-based Architecture**: Isolated game sessions with independent state management
- **Atomic Operations**: Lock-based champion selection preventing duplicate picks
- **Timer Synchronization**: Coordinated countdown timers across all clients
- **Error Handling**: Comprehensive error recovery and graceful degradation
- **Admin Tools**: Real-time inspection interface for monitoring active rooms

### Architecture Highlights
- Singleton pattern for timer management service
- Event-driven architecture with WebSocket handlers
- Modular route structure with clear separation of concerns
- Production-ready deployment configuration

---

*This project showcases expertise in real-time web applications, concurrent programming, and scalable backend architecture.*
