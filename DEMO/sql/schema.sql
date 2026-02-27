-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Počítač: localhost
-- Vytvořeno: Úte 07. říj 2025, 08:23
-- Verze serveru: 10.11.9-MariaDB-log
-- Verze PHP: 7.4.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Databáze: `16474_opp`
--

-- --------------------------------------------------------

--
-- Struktura tabulky `companies`
--

CREATE TABLE `companies` (
  `id` int(11) NOT NULL,
  `nazev` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `ico` varchar(20) DEFAULT NULL,
  `web` varchar(255) DEFAULT NULL,
  `poznamka` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

-- --------------------------------------------------------

--
-- Struktura tabulky `contacts`
--

CREATE TABLE `contacts` (
  `id` int(11) NOT NULL,
  `jmeno` varchar(255) NOT NULL,
  `prijmeni` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `poznamka` text DEFAULT NULL,
  `firma_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

-- --------------------------------------------------------

--
-- Struktura tabulky `deals`
--

CREATE TABLE `deals` (
  `id` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `popis` text DEFAULT NULL,
  `posledni_uprava` datetime DEFAULT NULL,
  `hodnota` decimal(10,2) DEFAULT NULL,
  `kontakt_id` int(11) DEFAULT NULL,
  `company_id` int(11) DEFAULT NULL,
  `stav_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

-- --------------------------------------------------------

--
-- Struktura tabulky `deal_contacts`
--

CREATE TABLE `deal_contacts` (
  `deal_id` int(11) NOT NULL,
  `contact_id` int(11) NOT NULL,
  `role` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktura tabulky `deal_statuses`
--

CREATE TABLE `deal_statuses` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `position` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

-- --------------------------------------------------------

--
-- Struktura tabulky `notes`
--

CREATE TABLE `notes` (
  `id` int(11) NOT NULL,
  `deal_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `content` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

--
-- Indexy pro exportované tabulky
--

--
-- Indexy pro tabulku `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`);

--
-- Indexy pro tabulku `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `firma_id` (`firma_id`);

--
-- Indexy pro tabulku `deals`
--
ALTER TABLE `deals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `kontakt_id` (`kontakt_id`),
  ADD KEY `fk_deal_status` (`stav_id`),
  ADD KEY `idx_deals_company_id` (`company_id`);

--
-- Indexy pro tabulku `deal_contacts`
--
ALTER TABLE `deal_contacts`
  ADD PRIMARY KEY (`deal_id`,`contact_id`),
  ADD KEY `idx_dc_contact` (`contact_id`);

--
-- Indexy pro tabulku `deal_statuses`
--
ALTER TABLE `deal_statuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexy pro tabulku `notes`
--
ALTER TABLE `notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notes_deal` (`deal_id`);

--
-- AUTO_INCREMENT pro tabulky
--

--
-- AUTO_INCREMENT pro tabulku `companies`
--
ALTER TABLE `companies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pro tabulku `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pro tabulku `deals`
--
ALTER TABLE `deals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pro tabulku `deal_statuses`
--
ALTER TABLE `deal_statuses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pro tabulku `notes`
--
ALTER TABLE `notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Omezení pro exportované tabulky
--

--
-- Omezení pro tabulku `contacts`
--
ALTER TABLE `contacts`
  ADD CONSTRAINT `contacts_ibfk_1` FOREIGN KEY (`firma_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;

--
-- Omezení pro tabulku `deals`
--
ALTER TABLE `deals`
  ADD CONSTRAINT `deals_ibfk_1` FOREIGN KEY (`kontakt_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_deal_status` FOREIGN KEY (`stav_id`) REFERENCES `deal_statuses` (`id`),
  ADD CONSTRAINT `fk_deals_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Omezení pro tabulku `deal_contacts`
--
ALTER TABLE `deal_contacts`
  ADD CONSTRAINT `fk_dc_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dc_deal` FOREIGN KEY (`deal_id`) REFERENCES `deals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Omezení pro tabulku `notes`
--
ALTER TABLE `notes`
  ADD CONSTRAINT `fk_notes_deal` FOREIGN KEY (`deal_id`) REFERENCES `deals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `notes_ibfk_1` FOREIGN KEY (`deal_id`) REFERENCES `deals` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
