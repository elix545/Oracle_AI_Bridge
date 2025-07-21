
Formas de conetarce a la base de datos vía un contenedor efimero

0. Hacer docker login
   ```sh
   docker login 
   docker login container-registry.oracle.com   
   ```
1. Listar redes de Docker
   ```sh
   docker network ls
   ```
2. La más sencilla
   ```sh
   docker run -it --rm --network=oracle_ai_bridge_ai_bridge_net container-registry.oracle.com/database/instantclient sqlplus middleware/oracle@oracle-xe:1521/XE
   ```

3. #Formato EZCONNECT (recomendado para pruebas rápidas)	
   ```sh
   docker run -it --rm --network=oracle_ai_bridge_ai_bridge_net  container-registry.oracle.com/database/instantclient sqlplus middleware/oracle@//oracle-xe:1521/XE
   ```

4. #Montnado el TNS vía un  volume, utinl en caso de que haya fallos de conexión
    ```sh
    docker run -it --rm -v C:\Users\ElisJ\Downloads\Oracle_AI_Bridge\sqlplus\tnsnames.ora:/usr/lib/oracle/12.2/client64/network/admin/tnsnames.ora -e TNS_ADMIN=/usr/lib/oracle/12.2/client64/network/admin --network=oracle_ai_bridge_ai_bridge_net container-registry.oracle.com/database/instantclient sqlplus middleware/oracle@XE
   ```

5. #Montnado el TNS vía un volumem, utinl en caso de que haya fallos de conexión abriendo una terminal sh
   
   4.1 Ver el contenido del archivo tnsnames.ora
   ```sh
   more C:\Users\ElisJ\Downloads\Oracle_AI_Bridge\sqlplus\tnsnames.ora
   ```

   4.2 Iniciar el contenedor con el archivo tnsnames.ora montando en /usr/lib/oracle/12.2/client64/network/admin/tnsnames.ora utilizando shell de sh
   ```sh
   docker run -it --rm -v C:\Users\ElisJ\Downloads\Oracle_AI_Bridge\sqlplus\tnsnames.ora:/usr/lib/oracle/12.2/client64/network/admin/tnsnames.ora -e TNS_ADMIN=/usr/lib/oracle/12.2/client64/network/admin --network=oracle_ai_bridge_ai_bridge_net container-registry.oracle.com/database/instantclient sh
   ```
   
   4.3 Ver el contenido del archivo tnsnames.ora dentro del contenedor
   ```sh
   ls /usr/lib/oracle/
   ls /usr/lib/oracle/12.2/client64/network/admin/ -la
   cat /usr/lib/oracle/12.2/client64/network/admin/tnsnames.ora
   export TNS_ADMIN=/usr/lib/oracle/12.2/client64/network/admin 
   ```
   
   4.4 Conectarse a la base de datos desde la terminal
   ```sh
   sqlplus middleware/oracle@XE
   ```