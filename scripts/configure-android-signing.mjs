import fs from 'node:fs';

const gradlePath = 'src-tauri/gen/android/app/build.gradle.kts';
if (!fs.existsSync(gradlePath)) {
  throw new Error('Tauri Android project has not been initialized: ' + gradlePath);
}
let source = fs.readFileSync(gradlePath, 'utf8');

if (!source.includes('import java.io.FileInputStream')) {
  source = 'import java.io.FileInputStream\n' + source;
}
if (!source.includes('import java.util.Properties')) {
  source = 'import java.util.Properties\n' + source;
}

if (!source.includes('signingConfigs {')) {
  const buildTypes = source.indexOf('buildTypes {');
  if (buildTypes < 0) throw new Error('Could not locate Android buildTypes in app/build.gradle.kts.');
  const signing = `signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            if (!keystorePropertiesFile.exists()) {
                throw GradleException("Android upload keystore properties are missing.")
            }
            val keystoreProperties = Properties()
            keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }

    `;
  source = source.slice(0, buildTypes) + signing + source.slice(buildTypes);
}

const releaseBlock = /getByName\("release"\)\s*\{/;
if (!/getByName\("release"\)\s*\{[^}]*signingConfig\s*=\s*signingConfigs\.getByName\("release"\)/s.test(source)) {
  if (!releaseBlock.test(source)) throw new Error('Could not locate the release build type block.');
  source = source.replace(releaseBlock, match => match + '\n            signingConfig = signingConfigs.getByName("release")');
}

fs.writeFileSync(gradlePath, source);
console.log('Android release signing configuration applied to the generated Tauri Gradle project.');
