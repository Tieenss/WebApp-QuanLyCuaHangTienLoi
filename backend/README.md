# Backend Setup

This is a Spring Boot backend application.

## Environment Setup

When cloning this project, you need to set up your local environment variables to connect to the database and other services.

1. Copy the `.env.example` file to create a new `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file and update the variables:
   - `SPRING_DATASOURCE_URL`: Update if your local PostgreSQL database has a different name or port.
   - `SPRING_DATASOURCE_USERNAME`: Your local PostgreSQL username.
   - `SPRING_DATASOURCE_PASSWORD`: Your local PostgreSQL password.
   - `CLOUDINARY_URL`: Add your Cloudinary URL if needed for image uploads.

## Running the Application

Make sure you have PostgreSQL running locally with a database created that matches your `.env` configuration (e.g., `cuahangtienloi`).

You can run the application using Maven:
```bash
./mvnw spring-boot:run
```
