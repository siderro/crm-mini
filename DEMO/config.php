<?php
$host = 'localhost';
$db   = '16474_opp';
$user = '16474_58204';
$pass = 'Ananas83!';

$mysqli = new mysqli($host, $user, $pass, $db);
if ($mysqli->connect_error) {
    // If called from API, don't die() - let API handle the error
    if (defined('API_MODE') && API_MODE) {
        // Set mysqli to null so API can detect the error
        $mysqli = null;
    } else {
        die('Connect Error (' . $mysqli->connect_errno . ') ' . $mysqli->connect_error);
    }
}


$users = [
    'siderro' => [
        'password' => 'ananas83',
        'role' => 'admin',
        'name' => 'Siderro'
    ],
    'dejzy' => [
        'password' => 'hesloveslo', 
        'role' => 'admin',
        'name' => 'Dejzy'
    ],
    'lukasSMSpulda' => [
        'password' => 'brutalniheslo',
        'role' => 'designer', 
        'name' => 'Lukas'
    ],
    'user' => [
        'password' => 'anotherpass',
        'role' => 'designer',
        'name' => 'User'
    ]
];

/**
 * PERMISSION CHECKING FUNCTIONS
 * ==============================
 * 
 * Use these functions throughout your application to control access:
 */

function getUserRole($username) {
    global $users;
    return isset($users[$username]) ? $users[$username]['role'] : null;
}

function isAdmin($username) {
    return getUserRole($username) === 'admin';
}

function isManager($username) {
    return getUserRole($username) === 'manager';
}

function isDesigner($username) {
    return getUserRole($username) === 'designer';
}

function hasPermission($username, $action) {
    $role = getUserRole($username);
    
    // Admin can do everything
    if ($role === 'admin') return true;
    
    // Define permissions for each role
    $permissions = [
        'manager' => [
            'view_contacts', 'edit_contacts', 'create_contacts',
            'view_deals', 'edit_deals', 'create_deals',
            'view_reports', 'view_analytics',
            'view_users', 'edit_users'
        ],
        'designer' => [
            'view_contacts', 'create_contacts',
            'view_deals', 'update_deal_status',
            'view_own_data', 'view_team_data'
        ]
    ];
    
    return isset($permissions[$role]) && in_array($action, $permissions[$role]);
}

function requirePermission($username, $action) {
    if (!hasPermission($username, $action)) {
        die('Access denied. You do not have permission to perform this action.');
    }
}


// Threshold values for conditional formatting
$DAYS_THRESHOLD_LAST_MODIFIED = 10;  // Days since last modification to highlight in red
$DAYS_THRESHOLD_CREATED = 60;       // Days since creation to highlight in red

$advisoryprompts = [
    'Advisory' => "Jsi kombinace špičkového obchodního analytika a zkušeného deal closera, který z dat vytáhne podstatné KPI, vyhodnotí stav pipeline a navrhne konkrétní akční kroky, jak příležitosti posunout dál; doporučení kombinuje číselnou analýzu a obchodnické rady, píše stručně a přehledně česky, přičemž z dodaného seznamu business oportunit z CRM vygeneruje: nadpis ve formátu [Datum generování] | Analýza obchodních příležitostí, rychlý přehled KPI (pipeline value, počet dealů, nové dealy, průměrná délka v pipeline, stuck dealy, forecast 30 dní) se stručným komentářem, rychlý přehled priorit (strukturované seznamy ve formátu Název dealu | Hodnota | Stav | Doporučená akce (+1 věta proč)), rozdělený do tří sekcí (Nejlepší potenciální dealy – proč a strategie posunu, Kandidáti na vyřazení – proč a zda testovat follow-up nebo uzavřít, Hidden gems – jen pokud opravdu existují a proč se jim věnovat), detailní analýzu s dalšími kroky pro každou skupinu, u frozen oportunit návrhy jak je dostat zpět do pipeline (SMS, call, e-mail s krátkým otvírákem), obchodní strategii (cross-sell, referral, upsell), a na závěr speciální oddíl Stav CRM dat s hodnocením kvality a úplnosti dat, výpisem chybějících položek (kontaktní osoba, follow-up datum, pravděpodobnost, segmentace) a návrhem procesu pro zlepšení (checklist + pořadí), to vše pouze z dodaných dat (co chybí označ N/A), akčně i analyticky, v češtině, jasně, stručně a v Markdownu.",

    'Obchodní Ředitel' => "Jsi obchodní ředitel – tvým úkolem je vyhodnotit seznam otevřených a frozen obchodních příležitostí. Piš stručně, jasně a prioritně jako zkušený obchodník a učitel, který umí složité věci vysvětlit jednoduše. 1. Úvod Na začátek napiš nadpis ve formátu: [Datum generování] | Analýza obchodních příležitostí 2. Rychlý přehled KPI Udělej krátký souhrn pipeline: Celková hodnota pipeline (pipeline value) Počet aktivních dealů Počet nových dealů (za poslední týden) Průměrná délka v pipeline Počet stuck dealů Forecast na 30 dní (realistický odhad z dealů blízko uzavření) Doplň ke KPI stručný komentář: co čísla znamenají, co je dobré a co je riziko. 3. Rychlý přehled priorit (strukturovaný seznam) Rozděl příležitosti do 3 sekcí a ke každé napiš: Název dealu | Hodnota | Stav | Doporučená akce (+1 věta proč) a) Nejlepší potenciální dealy – velká hodnota, čerstvá aktivita, blízko uzavření. b) Kandidáti na vyřazení – dlouho bez pohybu, nízká hodnota, ztracený zájem. c) Hidden gems (jen pokud skutečně jsou) – menší příležitosti, ale se strategickým významem (nový trh, prestižní klient, vlivný kontakt). 4. Detailní doporučení pro obchodníka U každé sekce rozveď doporučení: Jak konkrétně posunout nejlepší dealy (např. call, SMS, meeting, nabídka). Jak naložit s kandidáty na vyřazení (zkusit poslední kontakt / pustit). Jak vytěžit hidden gems. 5. Frozen deals U každé zamrzlé příležitosti navrhni, jak ji znovu rozpohybovat (konkrétní akce: zavolat, přeformulovat nabídku, najít nového decision makera). 6. Stav CRM dat Nakonec napiš krátké zhodnocení kvality dat: Kde chybí poznámky, kontakty nebo aktuální stav. Jaká data doplnit, aby příště byla analýza přesnější.",

    'Numbers-Driven' => "Jsi špičkový obchodní analytik, z dat o deal-flowu udělej stručnou česky psanou analýzu v Markdownu: nadpis [Datum generování] | Analýza obchodních příležitostí, rychlý přehled KPI (pipeline value, počet dealů, průměrná hodnota, průměrná délka v pipeline, počet frozen dealů, konverzní poměr, forecast 30 dní) s krátkým komentářem a upozorněním jen na „potenciální problém v datech“, přehled priorit (nejlepší dealy podle hodnoty a aktivity, kandidáti na vyřazení podle nízké hodnoty a stáří, frozen dealy s hodnotou a délkou existence), ignoruj poznámky a piš minimalisticky s maximální informační densitou.",

    'System Integrity' => "Jsi IT analytik a specialista na kvalitu dat, z dat CRM udělej česky psanou stručnou analýzu v Markdownu: Stav CRM dat (co je vyplněné dobře, co chybí nebo je nekonzistentní, dopady na obchodní procesy a reportování) a Návrh zlepšení (checklist jednoduchého procesu pro udržení kvality dat), ignoruj poznámky a obchodní komentáře, zaměř se jen na integritu a strukturu dat.",

    'Creative' => "Jsi majitel firmy s neotřelým přístupem a velkým zájmem o klientovy potřeby a velkou empatií. Vždy dodržuj tři základy komunikace v tomto pořadí: Přijetí – Zájem – Respekt. Buď milý, kreativní, veselý a hodný. Tvým úkolem je vzít seznam příležitostí a ke každé vytvořit: Nadpis – název dealu + krátký status (max 10 slov). Otevírací line pro call – 1–2 věty. Vždy napiš ve struktuře: Přijetí: ... Zájem: ... Respekt: ... SMS – krátká, jasná, lidská zpráva (max 2 věty). Také vždy napiš ve struktuře: Přijetí: ... Zájem: ... Respekt: ... U FROZEN dealů navíc: Diagnóza (max 3 věty, proč stojí/stagnuje). Krátký e-mail (max 5 vět). I zde použij formát: Přijetí: ... Zájem: ... Respekt: ... Výstup piš česky v Markdownu. Jednotlivé části vizuálně odděluj pomocí -----. Každý nový výstup vytvářej originálně, vycházej z principu Přijetí–Zájem–Respekt, ale nikdy mechanicky nekopíruj ukázky."

];

/**
 * Update deals statistics JSON file
 * This function calculates statistics for open and frozen deals and saves them to a JSON file
 * that can be accessed externally without authentication
 */
function updateDealsStats() {
    global $mysqli;
    
    // Check if database connection is available
    if (!isset($mysqli) || $mysqli === null || (isset($mysqli->connect_error) && $mysqli->connect_error)) {
        error_log('updateDealsStats: Database connection error - ' . (($mysqli && isset($mysqli->connect_error)) ? $mysqli->connect_error : 'mysqli not set or null'));
        return false;
    }
    
    // Get open deals count and total value (status = 'Opp')
    $open_deals_query = "
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(hodnota), 0) as total_value
        FROM deals d
        LEFT JOIN deal_statuses ds ON d.stav_id = ds.id
        WHERE ds.name = 'Opp'
    ";
    
    $open_result = $mysqli->query($open_deals_query);
    if (!$open_result) {
        error_log('updateDealsStats: Query error for open deals - ' . $mysqli->error);
        return false;
    }
    $open_data = $open_result->fetch_assoc();
    $open_deals_count = intval($open_data['count'] ?? 0);
    $open_deals_value = floatval($open_data['total_value'] ?? 0);
    
    // Get frozen deals count and total value (status = 'Frozen')
    $frozen_deals_query = "
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(hodnota), 0) as total_value
        FROM deals d
        LEFT JOIN deal_statuses ds ON d.stav_id = ds.id
        WHERE ds.name = 'Frozen'
    ";
    
    $frozen_result = $mysqli->query($frozen_deals_query);
    if (!$frozen_result) {
        error_log('updateDealsStats: Query error for frozen deals - ' . $mysqli->error);
        return false;
    }
    $frozen_data = $frozen_result->fetch_assoc();
    $frozen_deals_count = intval($frozen_data['count'] ?? 0);
    $frozen_deals_value = floatval($frozen_data['total_value'] ?? 0);
    
    // Prepare JSON data structure (extensible for future additions)
    $stats = [
        'openDeals' => $open_deals_count,
        'frozenDeals' => $frozen_deals_count,
        'openValue' => $open_deals_value,
        'frozenValue' => $frozen_deals_value,
        'pipelineCZK' => $open_deals_value, // Alias for backward compatibility
        'lastUpdated' => date('Y-m-d H:i:s')
    ];
    
    // Write to JSON file
    $json_file = __DIR__ . '/api/stats.json';
    
    // Create api directory if it doesn't exist
    $api_dir = dirname($json_file);
    if (!is_dir($api_dir)) {
        if (!mkdir($api_dir, 0755, true)) {
            error_log('updateDealsStats: Failed to create directory - ' . $api_dir);
            return false;
        }
    }
    
    // Write JSON file (use LOCK_EX to ensure atomic write)
    $json_content = json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $bytes_written = file_put_contents($json_file, $json_content, LOCK_EX);
    if ($bytes_written === false) {
        error_log('updateDealsStats: Failed to write JSON file - ' . $json_file);
        return false;
    }
    
    // Verify the file was written correctly
    if (file_exists($json_file)) {
        $written_content = file_get_contents($json_file);
        $written_data = json_decode($written_content, true);
        if (json_last_error() === JSON_ERROR_NONE && isset($written_data['lastUpdated'])) {
            // File written successfully
            return $stats;
        } else {
            error_log('updateDealsStats: JSON file written but content is invalid');
            return false;
        }
    } else {
        error_log('updateDealsStats: JSON file was not created');
        return false;
    }
}

?>

