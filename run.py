import os
import subprocess
import sys
import time
import shutil
import platform

def open_file(filepath):
    """Cross-platform function to open a file in the default editor"""
    try:
        if platform.system() == 'Windows':
            os.system(f'start "" "{filepath}"')
        elif platform.system() == 'Darwin':
            subprocess.call(('open', filepath))
        else:
            subprocess.call(('xdg-open', filepath))
    except Exception as e:
        print(f"[i] Не удалось автоматически открыть файл. Пожалуйста, откройте {filepath} вручную.")

def check_env_file():
    """Проверяет наличие файла .env.local и предлагает создать его из шаблона"""
    if not os.path.exists(".env.local"):
        print("[-] Файл .env.local не найден.")
        if os.path.exists(".env.example"):
            print("[?] Нашел шаблон .env.example. Создать .env.local на его основе? (y/n)")
            choice = input().lower()
            if choice == 'y':
                shutil.copy(".env.example", ".env.local")
                print("[+] Файл .env.local создан. ПОЖАЛУЙСТА, ОТРЕДАКТИРУЙТЕ ЕГО, добавив свои API ключи!")
                print("[i] Открываю файл для редактирования...")
                open_file(".env.local")
                sys.exit(0)
            else:
                print("[!] Пожалуйста, создайте .env.local вручную перед запуском.")
                sys.exit(1)
        else:
            print("[!] Ошибка: Ни .env.local, ни .env.example не найдены.")
            sys.exit(1)

    else:
        print("[+] Файл .env.local найден.")

def check_node_modules():
    """Проверяет установлены ли зависимости Node.js"""
    if not os.path.isdir("node_modules"):
        print("[-] Папка node_modules не найдена. Устанавливаем зависимости...")
        try:
            # Проверка наличия npm
            subprocess.run(["npm", "--version"], check=True, capture_output=True)
            subprocess.run(["npm", "install"], check=True)
            print("[+] Зависимости успешно установлены.")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("[-] Ошибка: npm не найден или произошла ошибка при установке.")
            print("    Убедитесь, что Node.js установлен: https://nodejs.org/")
            sys.exit(1)
    else:
        print("[+] Зависимости Node.js найдены.")

def start_server():
    """Запускает Next.js сервер"""
    print("\n" + "="*50)
    print("🚀 Zenly Clone запущен: http://localhost:3000")
    print("=====================================================\n")
    
    try:
        # Запускаем команду `npm run dev`
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            stdout=sys.stdout,
            stderr=sys.stderr,
            shell=True if os.name == 'nt' else False
        )
        process.wait()
    except KeyboardInterrupt:
        print("\n[!] Сервер остановлен.")
    except Exception as e:
        print(f"[-] Ошибка при запуске: {e}")

if __name__ == "__main__":
    print("🌟 Подготовка к запуску проекта...")
    check_env_file()
    check_node_modules()
    start_server()
