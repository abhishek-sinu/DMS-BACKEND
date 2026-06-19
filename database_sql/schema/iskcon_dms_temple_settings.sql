-- Table structure for table `temple_settings`
--
-- Stores the temple / trust details printed on donation receipts.
-- This is a single-row settings table (id is always 1). Managed from the
-- Temple Settings screen so the hard-coded receipt values can be edited.

DROP TABLE IF EXISTS `temple_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temple_settings` (
  `id` int NOT NULL DEFAULT '1',
  `name` varchar(255) NOT NULL DEFAULT '',
  `founder` varchar(255) NOT NULL DEFAULT '',
  `head_office` varchar(255) NOT NULL DEFAULT '',
  `address` varchar(500) NOT NULL DEFAULT '',
  `phones` varchar(255) NOT NULL DEFAULT '',
  `email` varchar(255) NOT NULL DEFAULT '',
  `registration` varchar(500) NOT NULL DEFAULT '',
  `logo_url` varchar(255) NOT NULL DEFAULT '/logo.png',
  `bank` varchar(150) NOT NULL DEFAULT '',
  `branch` varchar(150) NOT NULL DEFAULT '',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Seed data for table `temple_settings`
--

LOCK TABLES `temple_settings` WRITE;
/*!40000 ALTER TABLE `temple_settings` DISABLE KEYS */;
INSERT IGNORE INTO `temple_settings`
  (`id`, `name`, `founder`, `head_office`, `address`, `phones`, `email`, `registration`, `logo_url`, `bank`, `branch`)
VALUES
  (1,
   'INTERNATIONAL SOCIETY FOR KRISHNA CONSCIOUSNESS (ISKCON)',
   'Founder Acharya: His Divine Grace A.C. Bhaktivedanta Swami Prabhupada',
   '(Head Office: Hare Krishna Land, Juhu, Mumbai - 400 049)',
   'Temple : Hare Krishna Land, 5-4-743-745, Nampally Station Road, Opp. G Pulla Reddy Sweets Shop, Abids, Hyderabad, Telangana, India 500001',
   'Phone Nos: 9182822719 / 9849104991',
   'Email id : iskconhyddonations@gmail.com',
   '(Registered under Bombay Public Trusts Act Vide Registration No. F2179(Bom), PAN-AAATI0017P)',
   '/logo.png',
   'RAZORPAY',
   '');
/*!40000 ALTER TABLE `temple_settings` ENABLE KEYS */;
UNLOCK TABLES;
