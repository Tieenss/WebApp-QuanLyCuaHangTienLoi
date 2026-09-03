package com.erp.cuahangtienloi.seeder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    @Override
    public void run(String... args) throws Exception {
        logger.info("DataSeeder disabled - using existing database tables");
    }
}
