import subprocess
import time
import sys

def main():
    print("🚀 Инициализация проекта Zenly Clone...")

    try:
        # 1. Запуск Node.js сервера (Бэкенд + Подключение к БД)
        print("⏳ Поднимаем бэкенд и подключаемся к MongoDB...")
        # Используем shell=True, чтобы команды работали корректно на Windows
        server_process = subprocess.Popen(
            "node server.js", 
            cwd="server", 
            shell=True
        )

        # Даем серверу 3 секунды, чтобы он успел связаться с базой данных
        time.sleep(3)
        print("✅ Бэкенд запущен! Поднимаем фронтенд...")

        # 2. Запуск React-клиента (Фронтенд)
        client_process = subprocess.Popen(
            "npm start", 
            cwd="client", 
            shell=True
        )

        # Скрипт висит в фоне и держит сервера включенными
        server_process.wait()
        client_process.wait()

    except KeyboardInterrupt:
        # Если ты нажмешь Ctrl+C, скрипт аккуратно убьет оба сервера
        print("\n🛑 Выключаем сервера...")
        server_process.kill()
        client_process.kill()
        sys.exit(0)

if __name__ == "__main__":
    main()