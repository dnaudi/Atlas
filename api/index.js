    // SUPPORTS: weight, workout, effort, workout+effort
    if (data.type === 'weight') {
      range = 'Weight Tracker!A:P';
      values = [[
        data.date || new Date().toISOString().split('T')[0],
        data.time || '',
        data.weightLb || '',
        ...Array(13).fill('')   // fill the rest of the columns
      ]];

    } else if (['workout', 'workout+effort', 'effort'].includes(data.type)) {
      // Log workout sets
      if (data.exercises && data.exercises.length > 0) {
        range = 'Log!A:M';
        data.exercises.forEach(ex => {
          ex.sets.forEach((s, i) => {
            values.push([
              data.date || new Date().toISOString().split('T')[0],
              data.sessionId,
              ex.exercise,
              ex.liftCode,
              s.set || i + 1,
              s.weight,
              s.reps,
              s.rir ?? '',
              s.notes || '',
              `=F${values.length + 1}*G${values.length + 1}`,     // Volume
              `=F${values.length + 1}*(1+G${values.length + 1}/30)`, // e1RM
              '', 'OK'
            ]);
          });
        });
      }

      // Log effort data if present
      if (data.type.includes('effort') && data.duration) {
        const effortRange = 'Effort!A:H';
        const effortValues = [[
          data.date || new Date().toISOString().split('T')[0],
          data.sessionId,
          data.duration,
          data.activeCalories || '',
          data.totalCalories || '',
          data.avgHr || '',
          data.peakHr || '',
          data.location || 'Pitt Meadows Gym'
        ]];
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: effortRange,
          valueInputOption: 'USER_ENTERED',
          resource: { values: effortValues },
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
