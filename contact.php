<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (isset($_SERVER['HTTP_ORIGIN'])) {
    $originHost = parse_url((string) $_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    if ($originHost !== 'access-ia.pro') {
        fail(403, 'invalid_origin');
    }
}

function field(string $name, int $max): string
{
    $value = isset($_POST[$name]) ? trim((string) $_POST[$name]) : '';
    $value = str_replace(["\r", "\0"], '', $value);
    return substr($value, 0, $max);
}

function fail(int $status, string $error): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if (field('website', 200) !== '') {
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

$name = field('name', 120);
$email = field('email', 160);
$company = field('company', 160);
$need = field('need', 120);
$message = field('message', 2000);

if ($name === '' || $email === '' || $message === '') {
    fail(422, 'missing_required_fields');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail(422, 'invalid_email');
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateKey = preg_replace('/[^a-zA-Z0-9_.:-]/', '_', $ip);
$rateFile = sys_get_temp_dir() . '/accessia_contact_' . sha1($rateKey);
$now = time();
$window = 3600;
$maxAttempts = 5;
$attempts = [];

if (is_file($rateFile)) {
    $stored = json_decode((string) file_get_contents($rateFile), true);
    if (is_array($stored)) {
        $attempts = array_values(array_filter($stored, static fn ($ts) => is_int($ts) && $ts > $now - $window));
    }
}

if (count($attempts) >= $maxAttempts) {
    fail(429, 'rate_limited');
}

$attempts[] = $now;
file_put_contents($rateFile, json_encode($attempts), LOCK_EX);

$to = 'contact@access-ia.pro';
$subject = '[ACCESSIA Pro] Demande de contact';
$body = implode("\n", [
    'Nouvelle demande de contact depuis access-ia.pro',
    '',
    'Nom : ' . $name,
    'Email : ' . $email,
    'Societe : ' . ($company !== '' ? $company : 'Non renseignee'),
    'Besoin : ' . ($need !== '' ? $need : 'Non precise'),
    'IP : ' . $ip,
    '',
    'Message :',
    $message,
]);

$safeName = trim(preg_replace('/[\r\n]+/', ' ', $name) ?? '');

$headers = [
    'From: ACCESSIA Pro <contact@access-ia.pro>',
    'Reply-To: ' . $safeName . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: ACCESSIA Pro contact form',
];

$sent = mail($to, $subject, $body, implode("\r\n", $headers), '-fcontact@access-ia.pro');

if (!$sent) {
    fail(500, 'mail_send_failed');
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
