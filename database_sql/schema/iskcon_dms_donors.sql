-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: iskcon_dms
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

-- SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '0bf46dc7-115b-11f1-89e9-025041000001:1-365';

--
-- Table structure for table `donors`
--

DROP TABLE IF EXISTS `donors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `anniversary_date` date DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pan_card` varchar(20) DEFAULT NULL,
  `address_house` varchar(100) DEFAULT NULL,
  `address_city` varchar(100) DEFAULT NULL,
  `address_state` varchar(100) DEFAULT NULL,
  `address_pin` varchar(20) DEFAULT NULL,
  `cultivator_id` int DEFAULT NULL,
  `last_gift_details` text,
  PRIMARY KEY (`id`),
  KEY `fk_cultivator` (`cultivator_id`),
  CONSTRAINT `fk_cultivator` FOREIGN KEY (`cultivator_id`) REFERENCES `cultivators` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donors`
--

LOCK TABLES `donors` WRITE;
/*!40000 ALTER TABLE `donors` DISABLE KEYS */;
INSERT INTO `donors` VALUES (5,'Kavita Sharma','kavita.sharma@example.com','9876543215','Gachibowli','1987-09-10',NULL,'Attends weekly satsang','2026-03-08 14:59:59','2026-03-31 10:12:49','ABCDE1234F','123','Mumbai','Maharashtra','400001',3,'Photo Frame'),(6,'Pradeep Singh','pradeep.s@example.com','9876543216','Kukatpally','1983-01-24','2009-02-13','Wants receipts via email','2026-03-08 14:59:59','2026-03-31 08:23:34','ABCDE1234F','123','Mumbai','Maharashtra','400001',1,'Photo Frame'),(7,'Meera Joshi','meera.j@example.com','9876543216','Madhapur','1995-05-12',NULL,'New donor','2026-03-08 14:59:59','2026-03-12 12:36:45','ABCDE1234F','123','Mumbai','Maharashtra','400001',1,'Photo Frame'),(8,'Arun Nair','arun.n@example.com','9876543217','Kondapur','1989-04-18','2017-11-23','Supports food distribution','2026-03-08 14:59:59','2026-03-12 12:36:45','ABCDE1234F','123','Mumbai','Maharashtra','400001',1,'Photo Frame'),(9,'Shalini Gupta','shalini.g@example.com','9876543218','Begumpet','1991-07-30',NULL,'No calls after 6 PM','2026-03-08 14:59:59','2026-03-12 12:36:45','ABCDE1234F','123','Mumbai','Maharashtra','400001',1,'Photo Frame'),(10,'Rahul Desai','rahul.d@example.com','9876543219','Ameerpet','1993-10-05','2020-01-01','Donates annually','2026-03-08 14:59:59','2026-03-12 12:36:45','ABCDE1234F','123','Mumbai','Maharashtra','400001',1,'Photo Frame'),(11,'Neha Reddy','neha.r@example.com','9876543220','Hitech City','1986-12-28',NULL,'Prefers WhatsApp communication','2026-03-08 14:59:59','2026-03-12 12:36:45','ABCDE1234F','123','Mumbai','Maharashtra','400001',1,'Photo Frame'),(12,'Siddarth Menon','sid.m@example.com','9876543221','Manikonda','1994-03-22','2021-02-18','Follows ISKCON classes online','2026-03-08 14:59:59','2026-03-12 12:36:45','ABCDE1234F','123','Mumbai','Maharashtra','400001',1,'Photo Frame'),(13,'Lakshmi Prasad','lakshmi.p@example.com','9876543222','Miyapur','1982-06-10','2007-12-09','Old devotee','2026-03-08 14:59:59','2026-03-12 12:36:45','ABCDE1234F','123','Mumbai','Maharashtra','400001',1,'Photo Frame'),(14,'Ganesh Rao','ganesh.rao@example.com','9876543223','Dilsukhnagar','1996-09-01',NULL,'Interested in youth programs','2026-03-08 14:59:59','2026-03-12 12:36:45','ABCDE1234F','123','Mumbai','Maharashtra','400001',1,'Photo Frame'),(15,'Priya Verma','priya.v@example.com','9876543224','Nacharam','1990-11-17','2019-03-15','Prefers physical receipts','2026-03-08 14:59:59','2026-03-12 12:36:45','ABCDE1234F','123','Mumbai','Maharashtra','400001',1,'Photo Frame');
/*!40000 ALTER TABLE `donors` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-04 11:05:43
