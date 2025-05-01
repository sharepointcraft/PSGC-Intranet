import * as React from 'react';
import { IPowerPlantStatisticsProps } from './IPowerPlantStatisticsProps';
import styles from './PowerPlantStatistics.module.scss';

const PowerPlantStatistics: React.FC<IPowerPlantStatisticsProps> = ({ context }) => {
  const [unit1Data, setUnit1Data] = React.useState<string[]>([]);
  const [unit2Data, setUnit2Data] = React.useState<string[]>([]);

  const fetchCSV = async () => {
    try {
      const fileUrl = `${context.pageContext.web.absoluteUrl}/PowerPlantData/Sample%20Weather%20and%20Unit%20Stats.csv`;
      const response = await fetch(fileUrl, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      const rows = csvText.trim().split('\n').map(row => row.split(','));

      const headers = rows[0];
      const values = rows[1];

      const requiredKeys = [
        'pi_unit1mwh', 'pi_unit1nox', 'pi_unit1so2', 'pi_unit1co',
        'pi_unit2mwh', 'pi_unit2nox', 'pi_unit2so2', 'pi_unit2co'
      ];

      const dataMap: { [key: string]: string } = {};
      headers.forEach((header, i) => {
        if (requiredKeys.indexOf(header) !== -1) {

          dataMap[header] = values[i];
        }
      });

      setUnit1Data([
        dataMap['pi_unit1mwh'],
        dataMap['pi_unit1nox'],
        dataMap['pi_unit1so2'],
        dataMap['pi_unit1co']
      ]);

      setUnit2Data([
        dataMap['pi_unit2mwh'],
        dataMap['pi_unit2nox'],
        dataMap['pi_unit2so2'],
        dataMap['pi_unit2co']
      ]);
    } catch (error) {
      console.error("Failed to fetch CSV:", error);
    }
  };

  React.useEffect(() => {
    fetchCSV();
    const intervalId = setInterval(fetchCSV, 60000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.tableTitle}>Unit Stats</div>
      <table className={styles.unitTable}>
        <thead>
          <tr>
            <th></th>
            <th>Unit 1</th>
            <th>Unit 2</th>
          </tr>
        </thead>
        <tbody className={styles.unitTableBody}>
          <tr>
            <td>Net MWh</td>
            <td>{unit1Data[0]}</td>
            <td>{unit2Data[0]}</td>
          </tr>
          <tr>
            <td>NOX ppm</td>
            <td>{unit1Data[1]}</td>
            <td>{unit2Data[1]}</td>
          </tr>
          <tr>
            <td>SO2 ppm</td>
            <td>{unit1Data[2]}</td>
            <td>{unit2Data[2]}</td>
          </tr>
          <tr>
            <td>CO ppm</td>
            <td>{unit1Data[3]}</td>
            <td>{unit2Data[3]}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PowerPlantStatistics;
